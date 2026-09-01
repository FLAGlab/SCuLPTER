'use strict';
var $p;
var $fileLevelThis = this;
var $getOwnPropertyDescriptors = (Object.getOwnPropertyDescriptors || (() => {
  var ownKeysFun;
  if ((((typeof Reflect) !== "undefined") && Reflect.ownKeys)) {
    ownKeysFun = Reflect.ownKeys;
  } else {
    var getOwnPropertySymbols = (Object.getOwnPropertySymbols || ((o) => []));
    ownKeysFun = ((o) => Object.getOwnPropertyNames(o).concat(getOwnPropertySymbols(o)));
  }
  return ((o) => {
    var ownKeys = ownKeysFun(o);
    var descriptors = ({});
    var len = (ownKeys.length | 0);
    var i = 0;
    while ((i !== len)) {
      var key = ownKeys[i];
      Object.defineProperty(descriptors, key, ({
        "configurable": true,
        "enumerable": true,
        "writable": true,
        "value": Object.getOwnPropertyDescriptor(o, key)
      }));
      i = ((i + 1) | 0);
    }
    return descriptors;
  });
})());
function $Char(c) {
  this.c = c;
}
$p = $Char.prototype;
$p.toString = (function() {
  return String.fromCharCode(this.c);
});
function $Long(lo, hi) {
  this.l = lo;
  this.h = hi;
}
$p = $Long.prototype;
$p.toString = (function() {
  return $s_RTLong__toString__I__I__T(this.l, this.h);
});
function $noIsInstance(arg0) {
  throw new TypeError("Cannot call isInstance() on a Class representing a JS trait/object");
}
function $objectClone(arg0) {
  return Object.create(Object.getPrototypeOf(arg0), $getOwnPropertyDescriptors(arg0));
}
function $objectOrArrayClone(arg0) {
  return (arg0.$classData.Z ? arg0.d() : $objectClone(arg0));
}
function $objectGetClass(arg0) {
  switch ((typeof arg0)) {
    case "string": {
      return $d_T.l();
    }
    case "number": {
      if ($isInt(arg0)) {
        if ((((arg0 << 24) >> 24) === arg0)) {
          return $d_jl_Byte.l();
        } else if ((((arg0 << 16) >> 16) === arg0)) {
          return $d_jl_Short.l();
        } else {
          return $d_jl_Integer.l();
        }
      } else if ($isFloat(arg0)) {
        return $d_jl_Float.l();
      } else {
        return $d_jl_Double.l();
      }
    }
    case "boolean": {
      return $d_jl_Boolean.l();
    }
    case "undefined": {
      return $d_jl_Void.l();
    }
    default: {
      if ((arg0 instanceof $Long)) {
        return $d_jl_Long.l();
      } else if ((arg0 instanceof $Char)) {
        return $d_jl_Character.l();
      } else if ((!(!(arg0 && arg0.$classData)))) {
        return arg0.$classData.l();
      } else {
        return null;
      }
    }
  }
}
function $objectClassName(arg0) {
  switch ((typeof arg0)) {
    case "string": {
      return "java.lang.String";
    }
    case "number": {
      if ($isInt(arg0)) {
        if ((((arg0 << 24) >> 24) === arg0)) {
          return "java.lang.Byte";
        } else if ((((arg0 << 16) >> 16) === arg0)) {
          return "java.lang.Short";
        } else {
          return "java.lang.Integer";
        }
      } else if ($isFloat(arg0)) {
        return "java.lang.Float";
      } else {
        return "java.lang.Double";
      }
    }
    case "boolean": {
      return "java.lang.Boolean";
    }
    case "undefined": {
      return "java.lang.Void";
    }
    default: {
      if ((arg0 instanceof $Long)) {
        return "java.lang.Long";
      } else if ((arg0 instanceof $Char)) {
        return "java.lang.Character";
      } else if ((!(!(arg0 && arg0.$classData)))) {
        return arg0.$classData.N;
      } else {
        return null.ix();
      }
    }
  }
}
function $dp_equals__O__Z(instance, x0) {
  switch ((typeof instance)) {
    case "string": {
      return $f_T__equals__O__Z(instance, x0);
    }
    case "number": {
      return $f_jl_Double__equals__O__Z(instance, x0);
    }
    case "boolean": {
      return $f_jl_Boolean__equals__O__Z(instance, x0);
    }
    case "undefined": {
      return $f_jl_Void__equals__O__Z(instance, x0);
    }
    default: {
      if (((!(!(instance && instance.$classData))) || (instance === null))) {
        return instance.P(x0);
      } else if ((instance instanceof $Long)) {
        return $f_jl_Long__equals__O__Z(instance.l, instance.h, x0);
      } else if ((instance instanceof $Char)) {
        return $f_jl_Character__equals__O__Z(instance.c, x0);
      } else {
        return $c_O.prototype.P.call(instance, x0);
      }
    }
  }
}
function $dp_hashCode__I(instance) {
  switch ((typeof instance)) {
    case "string": {
      return $f_T__hashCode__I(instance);
    }
    case "number": {
      return $f_jl_Double__hashCode__I(instance);
    }
    case "boolean": {
      return $f_jl_Boolean__hashCode__I(instance);
    }
    case "undefined": {
      return $f_jl_Void__hashCode__I(instance);
    }
    default: {
      if (((!(!(instance && instance.$classData))) || (instance === null))) {
        return instance.S();
      } else if ((instance instanceof $Long)) {
        return $f_jl_Long__hashCode__I(instance.l, instance.h);
      } else if ((instance instanceof $Char)) {
        return $f_jl_Character__hashCode__I(instance.c);
      } else {
        return $c_O.prototype.S.call(instance);
      }
    }
  }
}
function $dp_toString__T(instance) {
  return ((instance === (void 0)) ? "undefined" : instance.toString());
}
function $checkIntDivisor(arg0) {
  if ((arg0 === 0)) {
    throw new $c_jl_ArithmeticException("/ by zero");
  } else {
    return arg0;
  }
}
function $doubleToInt(arg0) {
  return ((arg0 > 2147483647) ? 2147483647 : ((arg0 < (-2147483648)) ? (-2147483648) : (arg0 | 0)));
}
function $cToS(arg0) {
  return String.fromCharCode(arg0);
}
var $fpBitsDataView = new DataView(new ArrayBuffer(8));
function $floatToBits(arg0) {
  var dataView = $fpBitsDataView;
  dataView.setFloat32(0, arg0, true);
  return dataView.getInt32(0, true);
}
function $floatFromBits(arg0) {
  var dataView = $fpBitsDataView;
  dataView.setInt32(0, arg0, true);
  return dataView.getFloat32(0, true);
}
function $doubleToBits(arg0) {
  var dataView = $fpBitsDataView;
  return $s_RTLong__fromDoubleBits__D__O__J(arg0, dataView);
}
function $doubleFromBits(arg0) {
  var dataView = $fpBitsDataView;
  return $s_RTLong__bitsToDouble__I__I__O__D(arg0.l, arg0.h, dataView);
}
function $resolveSuperRef(arg0, arg1) {
  var getPrototypeOf = Object.getPrototyeOf;
  var getOwnPropertyDescriptor = Object.getOwnPropertyDescriptor;
  var superProto = arg0.prototype;
  while ((superProto !== null)) {
    var desc = getOwnPropertyDescriptor(superProto, arg1);
    if ((desc !== (void 0))) {
      return desc;
    }
    superProto = getPrototypeOf(superProto);
  }
}
function $superGet(arg0, arg1, arg2) {
  var desc = $resolveSuperRef(arg0, arg2);
  if ((desc !== (void 0))) {
    var getter = desc.get;
    return ((getter !== (void 0)) ? getter.call(arg1) : getter.value);
  }
}
function $superSet(arg0, arg1, arg2, arg3) {
  var desc = $resolveSuperRef(arg0, arg2);
  if ((desc !== (void 0))) {
    var setter = desc.set;
    if ((setter !== (void 0))) {
      setter.call(arg1, arg3);
      return (void 0);
    }
  }
  throw new TypeError((("super has no setter '" + arg2) + "'."));
}
function $arraycopyGeneric(arg0, arg1, arg2, arg3, arg4) {
  if (((arg0 !== arg2) || (((arg3 - arg1) >>> 0) > (arg4 >>> 0)))) {
    for (var i = 0; (i < arg4); i = ((i + 1) | 0)) {
      arg2[((arg3 + i) | 0)] = arg0[((arg1 + i) | 0)];
    }
  } else {
    for (var i = ((arg4 - 1) | 0); (i >= 0); i = ((i - 1) | 0)) {
      arg2[((arg3 + i) | 0)] = arg0[((arg1 + i) | 0)];
    }
  }
}
var $lastIDHash = 0;
var $idHashCodeMap = new WeakMap();
function $systemIdentityHashCode(obj) {
  switch ((typeof obj)) {
    case "string": {
      return $f_T__hashCode__I(obj);
    }
    case "number": {
      return $f_jl_Double__hashCode__I(obj);
    }
    case "bigint": {
      var biHash = 0;
      if ((obj < BigInt(0))) {
        obj = (~obj);
      }
      while ((obj !== BigInt(0))) {
        biHash = (biHash ^ Number(BigInt.asIntN(32, obj)));
        obj = (obj >> BigInt(32));
      }
      return biHash;
    }
    case "boolean": {
      return (obj ? 1231 : 1237);
    }
    case "undefined": {
      return 0;
    }
    case "symbol": {
      var description = obj.description;
      return ((description === (void 0)) ? 0 : $f_T__hashCode__I(description));
    }
    default: {
      if ((obj === null)) {
        return 0;
      } else {
        var hash = $idHashCodeMap.get(obj);
        if ((hash === (void 0))) {
          hash = (($lastIDHash + 1) | 0);
          $lastIDHash = hash;
          $idHashCodeMap.set(obj, hash);
        }
        return hash;
      }
    }
  }
}
function $isByte(arg0) {
  return ((((typeof arg0) === "number") && (((arg0 << 24) >> 24) === arg0)) && ((1 / arg0) !== (1 / (-0))));
}
function $isShort(arg0) {
  return ((((typeof arg0) === "number") && (((arg0 << 16) >> 16) === arg0)) && ((1 / arg0) !== (1 / (-0))));
}
function $isInt(arg0) {
  return ((((typeof arg0) === "number") && ((arg0 | 0) === arg0)) && ((1 / arg0) !== (1 / (-0))));
}
function $isFloat(arg0) {
  return (((typeof arg0) === "number") && ((arg0 !== arg0) || (Math.fround(arg0) === arg0)));
}
function $bC(arg0) {
  return new $Char(arg0);
}
var $bC0 = $bC(0);
function $bL(arg0, arg1) {
  return new $Long(arg0, arg1);
}
var $bL0 = $bL(0, 0);
function $uC(arg0) {
  return ((arg0 === null) ? 0 : arg0.c);
}
function $uJ(arg0) {
  return ((arg0 === null) ? $bL0 : arg0);
}
function $ct_O__($thiz) {
  return $thiz;
}
/** @constructor */
function $c_O() {
}
$p = $c_O.prototype;
$p.constructor = $c_O;
/** @constructor */
function $h_O() {
}
$h_O.prototype = $p;
$p.S = (function() {
  return $systemIdentityHashCode(this);
});
$p.P = (function(that) {
  return (this === that);
});
$p.A = (function() {
  var i = this.S();
  return (($objectClassName(this) + "@") + (i >>> 0.0).toString(16));
});
$p.toString = (function() {
  return this.A();
});
function $ac_O(arg) {
  if (((typeof arg) === "number")) {
    this.a = new Array(arg);
    for (var i = 0; (i < arg); (i++)) {
      this.a[i] = null;
    }
  } else {
    this.a = arg;
  }
}
$p = $ac_O.prototype = new $h_O();
$p.constructor = $ac_O;
$p.j = (function(srcPos, dest, destPos, length) {
  $arraycopyGeneric(this.a, srcPos, dest.a, destPos, length);
});
$p.d = (function() {
  return new $ac_O(this.a.slice());
});
function $ah_O() {
}
$ah_O.prototype = $p;
function $ac_Z(arg) {
  if (((typeof arg) === "number")) {
    this.a = new Array(arg);
    for (var i = 0; (i < arg); (i++)) {
      this.a[i] = false;
    }
  } else {
    this.a = arg;
  }
}
$p = $ac_Z.prototype = new $h_O();
$p.constructor = $ac_Z;
$p.j = (function(srcPos, dest, destPos, length) {
  $arraycopyGeneric(this.a, srcPos, dest.a, destPos, length);
});
$p.d = (function() {
  return new $ac_Z(this.a.slice());
});
function $ac_C(arg) {
  if (((typeof arg) === "number")) {
    this.a = new Uint16Array(arg);
  } else {
    this.a = arg;
  }
}
$p = $ac_C.prototype = new $h_O();
$p.constructor = $ac_C;
$p.j = (function(srcPos, dest, destPos, length) {
  dest.a.set(this.a.subarray(srcPos, ((srcPos + length) | 0)), destPos);
});
$p.d = (function() {
  return new $ac_C(this.a.slice());
});
function $ac_B(arg) {
  if (((typeof arg) === "number")) {
    this.a = new Int8Array(arg);
  } else {
    this.a = arg;
  }
}
$p = $ac_B.prototype = new $h_O();
$p.constructor = $ac_B;
$p.j = (function(srcPos, dest, destPos, length) {
  dest.a.set(this.a.subarray(srcPos, ((srcPos + length) | 0)), destPos);
});
$p.d = (function() {
  return new $ac_B(this.a.slice());
});
function $ac_S(arg) {
  if (((typeof arg) === "number")) {
    this.a = new Int16Array(arg);
  } else {
    this.a = arg;
  }
}
$p = $ac_S.prototype = new $h_O();
$p.constructor = $ac_S;
$p.j = (function(srcPos, dest, destPos, length) {
  dest.a.set(this.a.subarray(srcPos, ((srcPos + length) | 0)), destPos);
});
$p.d = (function() {
  return new $ac_S(this.a.slice());
});
function $ac_I(arg) {
  if (((typeof arg) === "number")) {
    this.a = new Int32Array(arg);
  } else {
    this.a = arg;
  }
}
$p = $ac_I.prototype = new $h_O();
$p.constructor = $ac_I;
$p.j = (function(srcPos, dest, destPos, length) {
  dest.a.set(this.a.subarray(srcPos, ((srcPos + length) | 0)), destPos);
});
$p.d = (function() {
  return new $ac_I(this.a.slice());
});
function $ac_J(arg) {
  if (((typeof arg) === "number")) {
    arg = (arg << 1);
    this.a = new Int32Array(arg);
  } else {
    this.a = arg;
  }
}
$p = $ac_J.prototype = new $h_O();
$p.constructor = $ac_J;
$p.j = (function(srcPos, dest, destPos, length) {
  dest.a.set(this.a.subarray((srcPos << 1), (((srcPos + length) | 0) << 1)), (destPos << 1));
});
$p.d = (function() {
  return new $ac_J(this.a.slice());
});
function $ac_F(arg) {
  if (((typeof arg) === "number")) {
    this.a = new Float32Array(arg);
  } else {
    this.a = arg;
  }
}
$p = $ac_F.prototype = new $h_O();
$p.constructor = $ac_F;
$p.j = (function(srcPos, dest, destPos, length) {
  dest.a.set(this.a.subarray(srcPos, ((srcPos + length) | 0)), destPos);
});
$p.d = (function() {
  return new $ac_F(this.a.slice());
});
function $ac_D(arg) {
  if (((typeof arg) === "number")) {
    this.a = new Float64Array(arg);
  } else {
    this.a = arg;
  }
}
$p = $ac_D.prototype = new $h_O();
$p.constructor = $ac_D;
$p.j = (function(srcPos, dest, destPos, length) {
  dest.a.set(this.a.subarray(srcPos, ((srcPos + length) | 0)), destPos);
});
$p.d = (function() {
  return new $ac_D(this.a.slice());
});
function $TypeData() {
  this.C = (void 0);
  this.n = null;
  this.O = null;
  this.B = null;
  this.D = 0;
  this.z = null;
  this.E = "";
  this.L = (void 0);
  this.A = (void 0);
  this.F = (void 0);
  this.w = (void 0);
  this.J = false;
  this.N = "";
  this.X = false;
  this.Y = false;
  this.Z = false;
  this.I = (void 0);
}
$p = $TypeData.prototype;
$p.p = (function(zero, arrayEncodedName, displayName, arrayClass, typedArrayClass) {
  this.n = ({});
  this.z = zero;
  this.E = arrayEncodedName;
  var self = this;
  this.F = ((that) => (that === self));
  this.N = displayName;
  this.X = true;
  this.I = ((obj) => false);
  if ((arrayClass !== (void 0))) {
    this.A = new $TypeData().y(this, arrayClass, typedArrayClass, (arrayEncodedName === "J"));
  }
  return this;
});
$p.i = (function(kindOrCtor, fullName, ancestors, isInstance) {
  var internalName = Object.getOwnPropertyNames(ancestors)[0];
  this.n = ancestors;
  this.E = (("L" + fullName) + ";");
  this.F = ((that) => (!(!that.n[internalName])));
  this.J = (kindOrCtor === 2);
  this.N = fullName;
  this.Y = (kindOrCtor === 1);
  this.I = (isInstance || ((obj) => (!(!((obj && obj.$classData) && obj.$classData.n[internalName])))));
  if (((typeof kindOrCtor) !== "number")) {
    kindOrCtor.prototype.$classData = this;
  }
  return this;
});
$p.y = (function(componentData, arrayClass, typedArrayClass, isLongArray, isAssignableFromFun) {
  arrayClass.prototype.$classData = this;
  var name = ("[" + componentData.E);
  this.C = arrayClass;
  this.n = ({
    R: 1,
    a: 1
  });
  this.O = componentData;
  this.B = componentData;
  this.D = 1;
  this.E = name;
  this.N = name;
  this.Z = true;
  var self = this;
  this.F = (isAssignableFromFun || ((that) => (self === that)));
  this.w = (isLongArray ? ((array) => {
    var len = (array.length | 0);
    var result = new arrayClass(len);
    var u = result.a;
    for (var i = 0; (i < len); i = ((i + 1) | 0)) {
      var srcElem = array[i];
      u[(i << 1)] = srcElem.l;
      u[(((i << 1) + 1) | 0)] = srcElem.h;
    }
    return result;
  }) : (typedArrayClass ? ((array) => new arrayClass(new typedArrayClass(array))) : ((array) => new arrayClass(array))));
  this.I = ((obj) => (obj instanceof arrayClass));
  return this;
});
$p.a = (function(componentData) {
  function ArrayClass(arg) {
    if (((typeof arg) === "number")) {
      this.a = new Array(arg);
      for (var i = 0; (i < arg); (i++)) {
        this.a[i] = null;
      }
    } else {
      this.a = arg;
    }
  }
  var $p = ArrayClass.prototype = new $ah_O();
  $p.constructor = ArrayClass;
  $p.j = (function(srcPos, dest, destPos, length) {
    $arraycopyGeneric(this.a, srcPos, dest.a, destPos, length);
  });
  $p.d = (function() {
    return new ArrayClass(this.a.slice());
  });
  $p.$classData = this;
  var arrayBase = (componentData.B || componentData);
  var arrayDepth = (componentData.D + 1);
  var name = ("[" + componentData.E);
  this.C = ArrayClass;
  this.n = ({
    R: 1,
    a: 1
  });
  this.O = componentData;
  this.B = arrayBase;
  this.D = arrayDepth;
  this.E = name;
  this.N = name;
  this.Z = true;
  var isAssignableFromFun = ((that) => {
    var thatDepth = that.D;
    return ((thatDepth === arrayDepth) ? arrayBase.F(that.B) : ((thatDepth > arrayDepth) && (arrayBase === $d_O)));
  });
  this.F = isAssignableFromFun;
  this.w = ((array) => new ArrayClass(array));
  var self = this;
  this.I = ((obj) => {
    var data = (obj && obj.$classData);
    return ((!(!data)) && ((data === self) || isAssignableFromFun(data)));
  });
  return this;
});
$p.r = (function() {
  if ((!this.A)) {
    this.A = new $TypeData().a(this);
  }
  return this.A;
});
$p.l = (function() {
  if ((!this.L)) {
    this.L = new $c_jl_Class(this);
  }
  return this.L;
});
$p.R = (function(that) {
  return ((this === that) || this.F(that));
});
$p.S = (function() {
  return (this.P ? this.P.l() : null);
});
$p.Q = (function() {
  return (this.O ? this.O.l() : null);
});
$p.U = (function(length) {
  if ((this === $d_V)) {
    throw $ct_jl_IllegalArgumentException__(new $c_jl_IllegalArgumentException());
  }
  return new (this.r().C)(length);
});
function $isArrayOf_O(obj, depth) {
  var data = (obj && obj.$classData);
  if ((!data)) {
    return false;
  } else {
    var arrayDepth = data.D;
    return ((arrayDepth === depth) ? (!data.B.X) : (arrayDepth > depth));
  }
}
function $isArrayOf_Z(obj, depth) {
  return (!(!(((obj && obj.$classData) && (obj.$classData.D === depth)) && (obj.$classData.B === $d_Z))));
}
function $isArrayOf_C(obj, depth) {
  return (!(!(((obj && obj.$classData) && (obj.$classData.D === depth)) && (obj.$classData.B === $d_C))));
}
function $isArrayOf_B(obj, depth) {
  return (!(!(((obj && obj.$classData) && (obj.$classData.D === depth)) && (obj.$classData.B === $d_B))));
}
function $isArrayOf_S(obj, depth) {
  return (!(!(((obj && obj.$classData) && (obj.$classData.D === depth)) && (obj.$classData.B === $d_S))));
}
function $isArrayOf_I(obj, depth) {
  return (!(!(((obj && obj.$classData) && (obj.$classData.D === depth)) && (obj.$classData.B === $d_I))));
}
function $isArrayOf_J(obj, depth) {
  return (!(!(((obj && obj.$classData) && (obj.$classData.D === depth)) && (obj.$classData.B === $d_J))));
}
function $isArrayOf_F(obj, depth) {
  return (!(!(((obj && obj.$classData) && (obj.$classData.D === depth)) && (obj.$classData.B === $d_F))));
}
function $isArrayOf_D(obj, depth) {
  return (!(!(((obj && obj.$classData) && (obj.$classData.D === depth)) && (obj.$classData.B === $d_D))));
}
var $d_O = new $TypeData();
$d_O.n = ({});
$d_O.E = "Ljava.lang.Object;";
$d_O.F = ((that) => (!that.X));
$d_O.N = "java.lang.Object";
$d_O.I = ((obj) => (obj !== null));
$d_O.A = new $TypeData().y($d_O, $ac_O, (void 0), false, ((that) => {
  var thatDepth = that.D;
  return ((thatDepth === 1) ? (!that.B.X) : (thatDepth > 1));
}));
$c_O.prototype.$classData = $d_O;
var $d_V = new $TypeData().p((void 0), "V", "void", (void 0), (void 0));
var $d_Z = new $TypeData().p(false, "Z", "boolean", $ac_Z, (void 0));
var $d_C = new $TypeData().p(0, "C", "char", $ac_C, Uint16Array);
var $d_B = new $TypeData().p(0, "B", "byte", $ac_B, Int8Array);
var $d_S = new $TypeData().p(0, "S", "short", $ac_S, Int16Array);
var $d_I = new $TypeData().p(0, "I", "int", $ac_I, Int32Array);
var $d_J = new $TypeData().p($bL0, "J", "long", $ac_J, Int32Array);
var $d_F = new $TypeData().p(0.0, "F", "float", $ac_F, Float32Array);
var $d_D = new $TypeData().p(0.0, "D", "double", $ac_D, Float64Array);
var $typedArraysAreBigEndian = (new Int8Array(new Int32Array([1]).buffer)[0] === 0);
function $constArrayBuffer_B(len, encoded) {
  var buf = new ArrayBuffer(len);
  var view = new DataView(buf);
  var regularChunksEnd = ((encoded.length - 4) | 0);
  var i = 0;
  var j = 0;
  var chunk = 0;
  while (true) {
    chunk = (((encoded.charCodeAt(i) | (encoded.charCodeAt(((i + 1) | 0)) << 8)) | (encoded.charCodeAt(((i + 2) | 0)) << 16)) | (encoded.charCodeAt(((i + 3) | 0)) << 24));
    chunk = ((((chunk - 808464432) | 0) - ((chunk & 1616928864) >>> 3)) | 0);
    chunk = (((chunk & 1056980736) >>> 2) | (chunk & 4128831));
    chunk = (((chunk & 268369920) >>> 4) | (chunk & 4095));
    if ((i === regularChunksEnd)) {
      break;
    }
    view.setUint32(j, chunk, true);
    i = ((i + 4) | 0);
    j = ((j + 3) | 0);
  }
  var trailing = ((len - j) | 0);
  view.setUint8(j, chunk);
  if ((trailing !== 1)) {
    view.setUint8(((j + 1) | 0), (chunk >>> 8));
    if ((trailing === 3)) {
      view.setUint8(((j + 2) | 0), (chunk >>> 16));
    }
  }
  return buf;
}
function $constArrayBuffer_S(len, encoded) {
  var buf = $constArrayBuffer_B((len << 1), encoded);
  if ($typedArraysAreBigEndian) {
    var view = new DataView(buf);
    var i = 0;
    while ((i !== len)) {
      view.putInt16(i, view.getInt16(i, true), false);
      i = ((i + 2) | 0);
    }
  }
  return buf;
}
function $constArrayBuffer_I(len, encoded) {
  var buf = $constArrayBuffer_B((len << 2), encoded);
  if ($typedArraysAreBigEndian) {
    var view = new DataView(buf);
    var i = 0;
    while ((i !== len)) {
      view.putInt32(i, view.getInt32(i, true), false);
      i = ((i + 4) | 0);
    }
  }
  return buf;
}
function $constArrayBuffer_J(len, encoded) {
  return $constArrayBuffer_I((len << 1), encoded);
}
function $constTypedArrayU_I(len, encoded, prevMask) {
  var buf = new Int32Array(len);
  var inLen = (encoded.length | 0);
  var prev = 0;
  var i = 0;
  var j = 0;
  var v = 0;
  while ((i !== inLen)) {
    var c = encoded.charCodeAt(i);
    if ((c < 80)) {
      v = ((v | (c - 48)) << 5);
    } else {
      v = (v | (c - 93));
      prev = (((prev & prevMask) + v) | 0);
      buf[j] = prev;
      j = ((j + 1) | 0);
      v = 0;
    }
    i = ((i + 1) | 0);
  }
  return buf;
}
function $constTypedArrayS_I(len, encoded, prevMask) {
  var buf = new Int32Array(len);
  var inLen = (encoded.length | 0);
  var prev = 0;
  var i = 0;
  var j = 0;
  var v = 0;
  var first = true;
  while ((i !== inLen)) {
    var c = encoded.charCodeAt(i);
    if ((c < 80)) {
      if (first) {
        v = (((c - 48) << 27) >> 22);
        first = false;
      } else {
        v = ((v | (c - 48)) << 5);
      }
    } else {
      if (first) {
        v = (((c - 93) << 27) >> 27);
      } else {
        v = (v | (c - 93));
        first = true;
      }
      prev = (((prev & prevMask) + v) | 0);
      buf[j] = prev;
      j = ((j + 1) | 0);
    }
    i = ((i + 1) | 0);
  }
  return buf;
}
function $constArrRaw_B(len, encoded) {
  return new $ac_B(new Int8Array($constArrayBuffer_B(len, encoded)));
}
function $constArrRaw_S(len, encoded) {
  return new $ac_S(new Int16Array($constArrayBuffer_S(len, encoded)));
}
function $constArrRaw_C(len, encoded) {
  return new $ac_C(new Uint16Array($constArrayBuffer_S(len, encoded)));
}
function $constArrRaw_I(len, encoded) {
  return new $ac_I(new Int32Array($constArrayBuffer_I(len, encoded)));
}
function $constArrRaw_J(len, encoded) {
  return new $ac_J(new Int32Array($constArrayBuffer_J(len, encoded)));
}
function $constArrUVals_I(len, encoded) {
  return new $ac_I($constTypedArrayU_I(len, encoded, 0));
}
function $constArrUDiffs_I(len, encoded) {
  return new $ac_I($constTypedArrayU_I(len, encoded, (-1)));
}
function $constArrSVals_I(len, encoded) {
  return new $ac_I($constTypedArrayS_I(len, encoded, 0));
}
function $constArrSDiffs_I(len, encoded) {
  return new $ac_I($constTypedArrayS_I(len, encoded, (-1)));
}
function $constArrUVals_J(len, encoded) {
  return new $ac_J($constTypedArrayU_I((len << 1), encoded, 0));
}
function $constArrUDiffs_J(len, encoded) {
  return new $ac_J($constTypedArrayU_I((len << 1), encoded, (-1)));
}
function $constArrSVals_J(len, encoded) {
  return new $ac_J($constTypedArrayS_I((len << 1), encoded, 0));
}
function $constArrSDiffs_J(len, encoded) {
  return new $ac_J($constTypedArrayS_I((len << 1), encoded, (-1)));
}
/** @constructor */
function $c_jl_Math$() {
}
$p = $c_jl_Math$.prototype = new $h_O();
$p.constructor = $c_jl_Math$;
/** @constructor */
function $h_jl_Math$() {
}
$h_jl_Math$.prototype = $p;
$p.ib = (function(d, scaleFactor) {
  var fpBitsDataView = $fpBitsDataView;
  fpBitsDataView.setFloat64(0, d, true);
  var lo = (fpBitsDataView.getInt32(0, true) | 0);
  var hi = (fpBitsDataView.getInt32(4, true) | 0);
  var e = (2047 & ((hi >>> 20) | 0));
  var newE = ((e + scaleFactor) | 0);
  var hi$1 = ((-2146435073) & hi);
  var java$lang$IntFloatBits$Int64Box$$value_$_lo = 0;
  var java$lang$IntFloatBits$Int64Box$$value_$_hi = 0;
  java$lang$IntFloatBits$Int64Box$$value_$_lo = lo;
  java$lang$IntFloatBits$Int64Box$$value_$_hi = hi$1;
  if ((!((((e - 1) | 0) >>> 0) <= 2045))) {
    var hi$2 = (2147483647 & hi);
    if ((((lo | hi$2) === 0) || (hi$2 >= 2146435072))) {
      return d;
    }
    var hi$3 = (1048575 & hi);
    var clz = ((hi$3 !== 0) ? Math.clz32(hi$3) : ((32 + Math.clz32(lo)) | 0));
    newE = ((newE - ((clz - 12) | 0)) | 0);
    var hi$4 = ((-2147483648) & hi);
    var y = ((clz - 11) | 0);
    var lo$2 = (((32 & y) === 0) ? (lo << y) : 0);
    var hi$5 = (((32 & y) === 0) ? (((((lo >>> 1) | 0) >>> (~y)) | 0) | (hi << y)) : (lo << y));
    var hi$6 = (1048575 & hi$5);
    var hi$7 = (hi$4 | hi$6);
    java$lang$IntFloatBits$Int64Box$$value_$_lo = lo$2;
    java$lang$IntFloatBits$Int64Box$$value_$_hi = hi$7;
  }
  if (((((newE - 1) | 0) >>> 0) <= 2045)) {
    var finalNewE = newE;
    var finalSignAndMantissa_$_lo = java$lang$IntFloatBits$Int64Box$$value_$_lo;
    var finalSignAndMantissa_$_hi = java$lang$IntFloatBits$Int64Box$$value_$_hi;
    var hi$8 = (finalNewE << 20);
    var hi$9 = (hi$8 | finalSignAndMantissa_$_hi);
    var fpBitsDataView$1 = $fpBitsDataView;
    fpBitsDataView$1.setInt32(0, finalSignAndMantissa_$_lo, true);
    fpBitsDataView$1.setInt32(4, hi$9, true);
    return (+fpBitsDataView$1.getFloat64(0, true));
  } else if (((((53 + newE) | 0) >>> 0) <= 53)) {
    var finalNewE$1 = ((54 + newE) | 0);
    var finalSignAndMantissa$1_$_lo = java$lang$IntFloatBits$Int64Box$$value_$_lo;
    var finalSignAndMantissa$1_$_hi = java$lang$IntFloatBits$Int64Box$$value_$_hi;
    var hi$10 = (finalNewE$1 << 20);
    var hi$11 = (hi$10 | finalSignAndMantissa$1_$_hi);
    var fpBitsDataView$2 = $fpBitsDataView;
    fpBitsDataView$2.setInt32(0, finalSignAndMantissa$1_$_lo, true);
    fpBitsDataView$2.setInt32(4, hi$11, true);
    return (5.551115123125783E-17 * (+fpBitsDataView$2.getFloat64(0, true)));
  } else {
    var finalNewE$2 = (2047 & (~(scaleFactor >> 31)));
    var hi$12 = ((-2147483648) & hi);
    var hi$13 = (finalNewE$2 << 20);
    var hi$14 = (hi$13 | hi$12);
    var fpBitsDataView$3 = $fpBitsDataView;
    fpBitsDataView$3.setInt32(0, 0, true);
    fpBitsDataView$3.setInt32(4, hi$14, true);
    return (+fpBitsDataView$3.getFloat64(0, true));
  }
});
var $d_jl_Math$ = new $TypeData().i($c_jl_Math$, "java.lang.Math$", ({
  bs: 1
}));
var $n_jl_Math$;
function $m_jl_Math$() {
  if ((!$n_jl_Math$)) {
    $n_jl_Math$ = new $c_jl_Math$();
  }
  return $n_jl_Math$;
}
/** @constructor */
function $c_jl_System$Streams$() {
  this.fp = null;
  this.gE = null;
  $n_jl_System$Streams$ = this;
  this.fp = new $c_jl_JSConsoleBasedPrintStream(false);
  this.gE = new $c_jl_JSConsoleBasedPrintStream(true);
}
$p = $c_jl_System$Streams$.prototype = new $h_O();
$p.constructor = $c_jl_System$Streams$;
/** @constructor */
function $h_jl_System$Streams$() {
}
$h_jl_System$Streams$.prototype = $p;
var $d_jl_System$Streams$ = new $TypeData().i($c_jl_System$Streams$, "java.lang.System$Streams$", ({
  bA: 1
}));
var $n_jl_System$Streams$;
function $m_jl_System$Streams$() {
  if ((!$n_jl_System$Streams$)) {
    $n_jl_System$Streams$ = new $c_jl_System$Streams$();
  }
  return $n_jl_System$Streams$;
}
function $p_jl_System$SystemProperties$__loadSystemProperties__O($thiz) {
  var result = ({});
  result["java.version"] = "1.8";
  result["java.vm.specification.version"] = "1.8";
  result["java.vm.specification.vendor"] = "Oracle Corporation";
  result["java.vm.specification.name"] = "Java Virtual Machine Specification";
  result["java.vm.name"] = "Scala.js";
  result["java.vm.version"] = "1.22.0";
  result["java.specification.version"] = "1.8";
  result["java.specification.vendor"] = "Oracle Corporation";
  result["java.specification.name"] = "Java Platform API Specification";
  result["file.separator"] = "/";
  result["path.separator"] = ":";
  result["line.separator"] = "\n";
  return result;
}
/** @constructor */
function $c_jl_System$SystemProperties$() {
  this.eK = null;
  this.fq = null;
  $n_jl_System$SystemProperties$ = this;
  this.eK = $p_jl_System$SystemProperties$__loadSystemProperties__O(this);
  this.fq = null;
}
$p = $c_jl_System$SystemProperties$.prototype = new $h_O();
$p.constructor = $c_jl_System$SystemProperties$;
/** @constructor */
function $h_jl_System$SystemProperties$() {
}
$h_jl_System$SystemProperties$.prototype = $p;
$p.fe = (function(key, default$1) {
  if ((this.eK !== null)) {
    var dict = this.eK;
    return ((!(!$m_jl_Utils$Cache$().fs.call(dict, key))) ? dict[key] : default$1);
  } else {
    return this.fq.fe(key, default$1);
  }
});
var $d_jl_System$SystemProperties$ = new $TypeData().i($c_jl_System$SystemProperties$, "java.lang.System$SystemProperties$", ({
  bB: 1
}));
var $n_jl_System$SystemProperties$;
function $m_jl_System$SystemProperties$() {
  if ((!$n_jl_System$SystemProperties$)) {
    $n_jl_System$SystemProperties$ = new $c_jl_System$SystemProperties$();
  }
  return $n_jl_System$SystemProperties$;
}
/** @constructor */
function $c_jl_Utils$Cache$() {
  this.fs = null;
  $n_jl_Utils$Cache$ = this;
  this.fs = Object.prototype.hasOwnProperty;
}
$p = $c_jl_Utils$Cache$.prototype = new $h_O();
$p.constructor = $c_jl_Utils$Cache$;
/** @constructor */
function $h_jl_Utils$Cache$() {
}
$h_jl_Utils$Cache$.prototype = $p;
var $d_jl_Utils$Cache$ = new $TypeData().i($c_jl_Utils$Cache$, "java.lang.Utils$Cache$", ({
  bD: 1
}));
var $n_jl_Utils$Cache$;
function $m_jl_Utils$Cache$() {
  if ((!$n_jl_Utils$Cache$)) {
    $n_jl_Utils$Cache$ = new $c_jl_Utils$Cache$();
  }
  return $n_jl_Utils$Cache$;
}
function $f_jl_Void__equals__O__Z($thiz, that) {
  return ($thiz === that);
}
function $f_jl_Void__hashCode__I($thiz) {
  return 0;
}
function $f_jl_Void__toString__T($thiz) {
  return "undefined";
}
var $d_jl_Void = new $TypeData().i(0, "java.lang.Void", ({
  bE: 1
}), ((x) => (x === (void 0))));
function $p_jl_reflect_Array$__mismatch__O__E($thiz, array) {
  throw $ct_jl_IllegalArgumentException__T__(new $c_jl_IllegalArgumentException(), "argument type mismatch");
}
/** @constructor */
function $c_jl_reflect_Array$() {
}
$p = $c_jl_reflect_Array$.prototype = new $h_O();
$p.constructor = $c_jl_reflect_Array$;
/** @constructor */
function $h_jl_reflect_Array$() {
}
$h_jl_reflect_Array$.prototype = $p;
$p.e1 = (function(array) {
  if ((array instanceof $ac_O)) {
    return array.a.length;
  } else if ((array instanceof $ac_Z)) {
    return array.a.length;
  } else if ((array instanceof $ac_C)) {
    return array.a.length;
  } else if ((array instanceof $ac_B)) {
    return array.a.length;
  } else if ((array instanceof $ac_S)) {
    return array.a.length;
  } else if ((array instanceof $ac_I)) {
    return array.a.length;
  } else if ((array instanceof $ac_J)) {
    return ((array.a.length >>> 1) | 0);
  } else if ((array instanceof $ac_F)) {
    return array.a.length;
  } else {
    if ((!(array instanceof $ac_D))) {
      $p_jl_reflect_Array$__mismatch__O__E(this, array);
    }
    return array.a.length;
  }
});
var $d_jl_reflect_Array$ = new $TypeData().i($c_jl_reflect_Array$, "java.lang.reflect.Array$", ({
  bF: 1
}));
var $n_jl_reflect_Array$;
function $m_jl_reflect_Array$() {
  if ((!$n_jl_reflect_Array$)) {
    $n_jl_reflect_Array$ = new $c_jl_reflect_Array$();
  }
  return $n_jl_reflect_Array$;
}
/** @constructor */
function $c_ju_Arrays$() {
}
$p = $c_ju_Arrays$.prototype = new $h_O();
$p.constructor = $c_ju_Arrays$;
/** @constructor */
function $h_ju_Arrays$() {
}
$h_ju_Arrays$.prototype = $p;
$p.h2 = (function(a, key) {
  var startIndex = 0;
  var endIndex = a.a.length;
  while (true) {
    if ((startIndex === endIndex)) {
      return (~startIndex);
    } else {
      var mid = ((((startIndex + endIndex) | 0) >>> 1) | 0);
      var elem = a.a[mid];
      var cmp = ((key === elem) ? 0 : ((key < elem) ? (-1) : 1));
      if ((cmp < 0)) {
        endIndex = mid;
        continue;
      }
      if ((cmp !== 0)) {
        startIndex = ((1 + mid) | 0);
        continue;
      }
      return mid;
    }
  }
});
$p.hg = (function(a, b) {
  if ((a === b)) {
    return true;
  }
  if (((a === null) || (b === null))) {
    return false;
  }
  var len = a.a.length;
  if ((b.a.length !== len)) {
    return false;
  }
  var i = 0;
  while ((i !== len)) {
    var i$1 = i;
    var $x_1 = a.a[i$1];
    var i$2 = i;
    if ((!($x_1 === b.a[i$2]))) {
      return false;
    }
    i = ((1 + i) | 0);
  }
  return true;
});
$p.O = (function(original, newLength) {
  var b = original.a.length;
  var copyLength = ((newLength < b) ? newLength : b);
  var ret = $objectGetClass(original).be.Q().be.U(newLength);
  original.j(0, ret, 0, copyLength);
  return ret;
});
$p.t = (function(original, from, to) {
  if ((from > to)) {
    throw $ct_jl_IllegalArgumentException__T__(new $c_jl_IllegalArgumentException(), ((from + " > ") + to));
  }
  var len = original.a.length;
  var retLength = ((to - from) | 0);
  var b = ((len - from) | 0);
  var copyLength = ((retLength < b) ? retLength : b);
  var ret = $objectGetClass(original).be.Q().be.U(retLength);
  original.j(from, ret, 0, copyLength);
  return ret;
});
var $d_ju_Arrays$ = new $TypeData().i($c_ju_Arrays$, "java.util.Arrays$", ({
  bG: 1
}));
var $n_ju_Arrays$;
function $m_ju_Arrays$() {
  if ((!$n_ju_Arrays$)) {
    $n_ju_Arrays$ = new $c_ju_Arrays$();
  }
  return $n_ju_Arrays$;
}
function $s_RTLong__remainderUnsigned__I__I__I__I__J(alo, ahi, blo, bhi) {
  return $m_RTLong$().i3(alo, ahi, blo, bhi);
}
function $s_RTLong__remainder__I__I__I__I__J(alo, ahi, blo, bhi) {
  return $m_RTLong$().i2(alo, ahi, blo, bhi);
}
function $s_RTLong__divideUnsigned__I__I__I__I__J(alo, ahi, blo, bhi) {
  return $m_RTLong$().hd(alo, ahi, blo, bhi);
}
function $s_RTLong__divide__I__I__I__I__J(alo, ahi, blo, bhi) {
  return $m_RTLong$().hc(alo, ahi, blo, bhi);
}
function $s_RTLong__fromDoubleBits__D__O__J(value, fpBitsDataView) {
  fpBitsDataView.setFloat64(0, value, true);
  var lo = (fpBitsDataView.getInt32(0, true) | 0);
  var hi = (fpBitsDataView.getInt32(4, true) | 0);
  return $bL(lo, hi);
}
function $s_RTLong__fromDouble__D__J(value) {
  return $m_RTLong$().gk(value);
}
function $s_RTLong__fromUnsignedInt__I__J(value) {
  return $bL(value, 0);
}
function $s_RTLong__fromInt__I__J(value) {
  var hi = (value >> 31);
  return $bL(value, hi);
}
function $s_RTLong__clz__I__I__I(lo, hi) {
  return ((hi !== 0) ? Math.clz32(hi) : ((32 + Math.clz32(lo)) | 0));
}
function $s_RTLong__toFloat__I__I__F(lo, hi) {
  return Math.fround(((4.294967296E9 * hi) + ((((((-2097152) & (hi ^ (hi >> 10))) === 0) || ((65535 & lo) === 0)) ? lo : (32768 | ((-32768) & lo))) >>> 0.0)));
}
function $s_RTLong__toDouble__I__I__D(lo, hi) {
  return ((4.294967296E9 * hi) + (lo >>> 0.0));
}
function $s_RTLong__toInt__I__I__I(lo, hi) {
  return lo;
}
function $s_RTLong__toString__I__I__T(lo, hi) {
  return $m_RTLong$().gz(lo, hi);
}
function $s_RTLong__bitsToDouble__I__I__O__D(lo, hi, fpBitsDataView) {
  fpBitsDataView.setInt32(0, lo, true);
  fpBitsDataView.setInt32(4, hi, true);
  return (+fpBitsDataView.getFloat64(0, true));
}
function $s_RTLong__mul__I__I__I__I__J(alo, ahi, blo, bhi) {
  var a0 = (65535 & alo);
  var a1 = ((alo >>> 16) | 0);
  var b0 = (65535 & blo);
  var b1 = ((blo >>> 16) | 0);
  var a0b0 = Math.imul(a0, b0);
  var a1b0 = Math.imul(a1, b0);
  var a0b1 = Math.imul(a0, b1);
  var lo = ((a0b0 + (((a1b0 + a0b1) | 0) << 16)) | 0);
  var c1part = ((((a0b0 >>> 16) | 0) + a0b1) | 0);
  var hi = ((((((((Math.imul(alo, bhi) + Math.imul(ahi, blo)) | 0) + Math.imul(a1, b1)) | 0) + ((c1part >>> 16) | 0)) | 0) + (((((65535 & c1part) + a1b0) | 0) >>> 16) | 0)) | 0);
  return $bL(lo, hi);
}
function $s_RTLong__sub__I__I__I__I__J(alo, ahi, blo, bhi) {
  var lo = ((alo - blo) | 0);
  var hi = ((((ahi - bhi) | 0) - (((lo >>> 0) > (alo >>> 0)) | 0)) | 0);
  return $bL(lo, hi);
}
function $s_RTLong__add__I__I__I__I__J(alo, ahi, blo, bhi) {
  var lo = ((alo + blo) | 0);
  var hi = ((((ahi + bhi) | 0) + (((lo >>> 0) < (alo >>> 0)) | 0)) | 0);
  return $bL(lo, hi);
}
function $s_RTLong__sar__I__I__I__J(lo, hi, n) {
  var lo$1 = (((32 & n) === 0) ? (((lo >>> n) | 0) | ((hi << 1) << (~n))) : (hi >> n));
  var hi$1 = (((32 & n) === 0) ? (hi >> n) : (hi >> 31));
  return $bL(lo$1, hi$1);
}
function $s_RTLong__shr__I__I__I__J(lo, hi, n) {
  var lo$1 = (((32 & n) === 0) ? (((lo >>> n) | 0) | ((hi << 1) << (~n))) : ((hi >>> n) | 0));
  var hi$1 = (((32 & n) === 0) ? ((hi >>> n) | 0) : 0);
  return $bL(lo$1, hi$1);
}
function $s_RTLong__shl__I__I__I__J(lo, hi, n) {
  var lo$1 = (((32 & n) === 0) ? (lo << n) : 0);
  var hi$1 = (((32 & n) === 0) ? (((((lo >>> 1) | 0) >>> (~n)) | 0) | (hi << n)) : (lo << n));
  return $bL(lo$1, hi$1);
}
function $s_RTLong__xor__I__I__I__I__J(alo, ahi, blo, bhi) {
  var lo = (alo ^ blo);
  var hi = (ahi ^ bhi);
  return $bL(lo, hi);
}
function $s_RTLong__and__I__I__I__I__J(alo, ahi, blo, bhi) {
  var lo = (alo & blo);
  var hi = (ahi & bhi);
  return $bL(lo, hi);
}
function $s_RTLong__or__I__I__I__I__J(alo, ahi, blo, bhi) {
  var lo = (alo | blo);
  var hi = (ahi | bhi);
  return $bL(lo, hi);
}
function $s_RTLong__geu__I__I__I__I__Z(alo, ahi, blo, bhi) {
  return ((ahi === bhi) ? ((alo >>> 0) >= (blo >>> 0)) : ((ahi >>> 0) > (bhi >>> 0)));
}
function $s_RTLong__gtu__I__I__I__I__Z(alo, ahi, blo, bhi) {
  return ((ahi === bhi) ? ((alo >>> 0) > (blo >>> 0)) : ((ahi >>> 0) > (bhi >>> 0)));
}
function $s_RTLong__leu__I__I__I__I__Z(alo, ahi, blo, bhi) {
  return ((ahi === bhi) ? ((alo >>> 0) <= (blo >>> 0)) : ((ahi >>> 0) < (bhi >>> 0)));
}
function $s_RTLong__ltu__I__I__I__I__Z(alo, ahi, blo, bhi) {
  return ((ahi === bhi) ? ((alo >>> 0) < (blo >>> 0)) : ((ahi >>> 0) < (bhi >>> 0)));
}
function $s_RTLong__ge__I__I__I__I__Z(alo, ahi, blo, bhi) {
  return ((ahi === bhi) ? ((alo >>> 0) >= (blo >>> 0)) : (ahi > bhi));
}
function $s_RTLong__gt__I__I__I__I__Z(alo, ahi, blo, bhi) {
  return ((ahi === bhi) ? ((alo >>> 0) > (blo >>> 0)) : (ahi > bhi));
}
function $s_RTLong__le__I__I__I__I__Z(alo, ahi, blo, bhi) {
  return ((ahi === bhi) ? ((alo >>> 0) <= (blo >>> 0)) : (ahi < bhi));
}
function $s_RTLong__lt__I__I__I__I__Z(alo, ahi, blo, bhi) {
  return ((ahi === bhi) ? ((alo >>> 0) < (blo >>> 0)) : (ahi < bhi));
}
function $s_RTLong__notEquals__I__I__I__I__Z(alo, ahi, blo, bhi) {
  return (((alo ^ blo) | (ahi ^ bhi)) !== 0);
}
function $s_RTLong__equals__I__I__I__I__Z(alo, ahi, blo, bhi) {
  return (((alo ^ blo) | (ahi ^ bhi)) === 0);
}
/** @constructor */
function $c_RTLong$() {
}
$p = $c_RTLong$.prototype = new $h_O();
$p.constructor = $c_RTLong$;
/** @constructor */
function $h_RTLong$() {
}
$h_RTLong$.prototype = $p;
$p.gz = (function(lo, hi) {
  if ((hi === (lo >> 31))) {
    return ("" + lo);
  } else if ((((-2097152) & (hi ^ (hi >> 10))) === 0)) {
    return ("" + ((4.294967296E9 * hi) + (lo >>> 0.0)));
  } else {
    var sign = (hi >> 31);
    var xlo = (lo ^ sign);
    var rlo = ((xlo - sign) | 0);
    var rhi = (((hi ^ sign) + (((rlo >>> 0) < (xlo >>> 0)) | 0)) | 0);
    var aHat = ((4.294967296E9 * (rhi >>> 0.0)) + (rlo >>> 0.0));
    var qHat = (+Math.floor((1.0000000000000265E-9 * aHat)));
    var rHat = ((rlo - Math.imul(1000000000, (qHat | 0.0))) | 0);
    if ((rHat < 0)) {
      qHat = (qHat - 1.0);
      rHat = ((1000000000 + rHat) | 0);
    }
    var this$7 = rHat;
    var remStr = ("" + this$7);
    var $x_1 = qHat;
    var start = remStr.length;
    var s = ((("" + $x_1) + "000000000".substring(start)) + remStr);
    return ((hi < 0) ? ("-" + s) : s);
  }
});
$p.gk = (function(value) {
  if ((value < (-9.223372036854776E18))) {
    return $bL(0, (-2147483648));
  } else if ((value >= 9.223372036854776E18)) {
    return $bL((-1), 2147483647);
  } else {
    var rawLo = (value | 0.0);
    var rawHi = ((2.3283064365386963E-10 * value) | 0.0);
    var hi = (((value < 0.0) && (rawLo !== 0)) ? ((rawHi - 1) | 0) : rawHi);
    return $bL(rawLo, hi);
  }
});
$p.hc = (function(alo, ahi, blo, bhi) {
  var sign = (ahi >> 31);
  var xlo = (alo ^ sign);
  var rlo = ((xlo - sign) | 0);
  var rhi = (((ahi ^ sign) + (((rlo >>> 0) < (xlo >>> 0)) | 0)) | 0);
  var sign$1 = (bhi >> 31);
  var xlo$1 = (blo ^ sign$1);
  var rlo$1 = ((xlo$1 - sign$1) | 0);
  var rhi$1 = (((bhi ^ sign$1) + (((rlo$1 >>> 0) < (xlo$1 >>> 0)) | 0)) | 0);
  if (((rhi$1 | ((-2097152) & rlo$1)) === 0)) {
    var quotHi = (((rhi >>> 0) / ($checkIntDivisor(rlo$1) >>> 0)) | 0);
    var k = ((rhi - Math.imul(rlo$1, quotHi)) | 0);
    var quotLo = ((((4.294967296E9 * k) + (rlo >>> 0.0)) / rlo$1) | 0.0);
    var absR_$_lo = quotLo;
    var absR_$_hi = quotHi;
  } else {
    var aHat = ((4.294967296E9 * (rhi >>> 0.0)) + (rlo >>> 0.0));
    var bHat = ((4.294967296E9 * (rhi$1 >>> 0.0)) + (rlo$1 >>> 0.0));
    var x$1 = ((aHat / bHat) + 0.00390625);
    var lo = (x$1 | 0.0);
    var hi = ((2.3283064365386963E-10 * x$1) | 0.0);
    var a0 = (65535 & rlo$1);
    var a1 = ((rlo$1 >>> 16) | 0);
    var b0 = (65535 & lo);
    var b1 = ((lo >>> 16) | 0);
    var a0b0 = Math.imul(a0, b0);
    var a1b0 = Math.imul(a1, b0);
    var a0b1 = Math.imul(a0, b1);
    var lo$1 = ((a0b0 + (((a1b0 + a0b1) | 0) << 16)) | 0);
    var c1part = ((((a0b0 >>> 16) | 0) + a0b1) | 0);
    if ((((((rhi - ((((((((Math.imul(rlo$1, hi) + Math.imul(rhi$1, lo)) | 0) + Math.imul(a1, b1)) | 0) + ((c1part >>> 16) | 0)) | 0) + (((((65535 & c1part) + a1b0) | 0) >>> 16) | 0)) | 0)) | 0) - (((((rlo - lo$1) | 0) >>> 0) > (rlo >>> 0)) | 0)) | 0) < 0)) {
      var lo$3 = ((lo - 1) | 0);
      var hi$3 = ((((hi - 1) | 0) + ((lo$3 !== (-1)) | 0)) | 0);
      var absR_$_lo = lo$3;
      var absR_$_hi = hi$3;
    } else {
      var absR_$_lo = lo;
      var absR_$_hi = hi;
    }
  }
  if (((ahi ^ bhi) >= 0)) {
    return $bL(absR_$_lo, absR_$_hi);
  } else {
    var lo$4 = ((-absR_$_lo) | 0);
    var hi$4 = ((((-absR_$_hi) | 0) - ((lo$4 !== 0) | 0)) | 0);
    return $bL(lo$4, hi$4);
  }
});
$p.hd = (function(alo, ahi, blo, bhi) {
  if (((bhi | ((-2097152) & blo)) === 0)) {
    var quotHi = (((ahi >>> 0) / ($checkIntDivisor(blo) >>> 0)) | 0);
    var k = ((ahi - Math.imul(blo, quotHi)) | 0);
    var quotLo = ((((4.294967296E9 * k) + (alo >>> 0.0)) / blo) | 0.0);
    return $bL(quotLo, quotHi);
  } else if ((bhi >= 0)) {
    var aHat = ((4.294967296E9 * (ahi >>> 0.0)) + (alo >>> 0.0));
    var bHat = ((4.294967296E9 * (bhi >>> 0.0)) + (blo >>> 0.0));
    var x$1 = ((aHat / bHat) + 0.00390625);
    var lo = (x$1 | 0.0);
    var hi = ((2.3283064365386963E-10 * x$1) | 0.0);
    var a0 = (65535 & blo);
    var a1 = ((blo >>> 16) | 0);
    var b0 = (65535 & lo);
    var b1 = ((lo >>> 16) | 0);
    var a0b0 = Math.imul(a0, b0);
    var a1b0 = Math.imul(a1, b0);
    var a0b1 = Math.imul(a0, b1);
    var lo$1 = ((a0b0 + (((a1b0 + a0b1) | 0) << 16)) | 0);
    var c1part = ((((a0b0 >>> 16) | 0) + a0b1) | 0);
    if ((((((ahi - ((((((((Math.imul(blo, hi) + Math.imul(bhi, lo)) | 0) + Math.imul(a1, b1)) | 0) + ((c1part >>> 16) | 0)) | 0) + (((((65535 & c1part) + a1b0) | 0) >>> 16) | 0)) | 0)) | 0) - (((((alo - lo$1) | 0) >>> 0) > (alo >>> 0)) | 0)) | 0) < 0)) {
      var lo$3 = ((lo - 1) | 0);
      var hi$3 = ((((hi - 1) | 0) + ((lo$3 !== (-1)) | 0)) | 0);
      return $bL(lo$3, hi$3);
    } else {
      return $bL(lo, hi);
    }
  } else if (((ahi === bhi) ? ((alo >>> 0) < (blo >>> 0)) : ((ahi >>> 0) < (bhi >>> 0)))) {
    return $bL(0, 0);
  } else {
    return $bL(1, 0);
  }
});
$p.i2 = (function(alo, ahi, blo, bhi) {
  var sign = (ahi >> 31);
  var xlo = (alo ^ sign);
  var rlo = ((xlo - sign) | 0);
  var rhi = (((ahi ^ sign) + (((rlo >>> 0) < (xlo >>> 0)) | 0)) | 0);
  var sign$1 = (bhi >> 31);
  var xlo$1 = (blo ^ sign$1);
  var rlo$1 = ((xlo$1 - sign$1) | 0);
  var rhi$1 = (((bhi ^ sign$1) + (((rlo$1 >>> 0) < (xlo$1 >>> 0)) | 0)) | 0);
  if (((rhi$1 | ((-2097152) & rlo$1)) === 0)) {
    var k$2 = (((rhi >>> 0) % ($checkIntDivisor(rlo$1) >>> 0)) | 0);
    var quotLo$2 = ((((4.294967296E9 * k$2) + (rlo >>> 0.0)) / rlo$1) | 0.0);
    var remLo = ((rlo - Math.imul(rlo$1, quotLo$2)) | 0);
    var absR_$_lo = remLo;
    var absR_$_hi = 0;
  } else {
    var aHat = ((4.294967296E9 * (rhi >>> 0.0)) + (rlo >>> 0.0));
    var bHat = ((4.294967296E9 * (rhi$1 >>> 0.0)) + (rlo$1 >>> 0.0));
    var x$1 = ((aHat / bHat) + 0.00390625);
    var lo = (x$1 | 0.0);
    var hi = ((2.3283064365386963E-10 * x$1) | 0.0);
    var a0 = (65535 & rlo$1);
    var a1 = ((rlo$1 >>> 16) | 0);
    var b0 = (65535 & lo);
    var b1 = ((lo >>> 16) | 0);
    var a0b0 = Math.imul(a0, b0);
    var a1b0 = Math.imul(a1, b0);
    var a0b1 = Math.imul(a0, b1);
    var lo$1 = ((a0b0 + (((a1b0 + a0b1) | 0) << 16)) | 0);
    var c1part = ((((a0b0 >>> 16) | 0) + a0b1) | 0);
    var hi$1 = ((((((((Math.imul(rlo$1, hi) + Math.imul(rhi$1, lo)) | 0) + Math.imul(a1, b1)) | 0) + ((c1part >>> 16) | 0)) | 0) + (((((65535 & c1part) + a1b0) | 0) >>> 16) | 0)) | 0);
    var lo$2 = ((rlo - lo$1) | 0);
    var hi$2 = ((((rhi - hi$1) | 0) - (((lo$2 >>> 0) > (rlo >>> 0)) | 0)) | 0);
    if ((hi$2 < 0)) {
      var lo$3 = ((lo$2 + rlo$1) | 0);
      var hi$3 = ((((hi$2 + rhi$1) | 0) + (((lo$3 >>> 0) < (lo$2 >>> 0)) | 0)) | 0);
      var absR_$_lo = lo$3;
      var absR_$_hi = hi$3;
    } else {
      var absR_$_lo = lo$2;
      var absR_$_hi = hi$2;
    }
  }
  if ((ahi < 0)) {
    var lo$4 = ((-absR_$_lo) | 0);
    var hi$4 = ((((-absR_$_hi) | 0) - ((lo$4 !== 0) | 0)) | 0);
    return $bL(lo$4, hi$4);
  } else {
    return $bL(absR_$_lo, absR_$_hi);
  }
});
$p.i3 = (function(alo, ahi, blo, bhi) {
  if (((bhi | ((-2097152) & blo)) === 0)) {
    var k$2 = (((ahi >>> 0) % ($checkIntDivisor(blo) >>> 0)) | 0);
    var quotLo$2 = ((((4.294967296E9 * k$2) + (alo >>> 0.0)) / blo) | 0.0);
    var remLo = ((alo - Math.imul(blo, quotLo$2)) | 0);
    return $bL(remLo, 0);
  } else if ((bhi >= 0)) {
    var aHat = ((4.294967296E9 * (ahi >>> 0.0)) + (alo >>> 0.0));
    var bHat = ((4.294967296E9 * (bhi >>> 0.0)) + (blo >>> 0.0));
    var x$1 = ((aHat / bHat) + 0.00390625);
    var lo = (x$1 | 0.0);
    var hi = ((2.3283064365386963E-10 * x$1) | 0.0);
    var a0 = (65535 & blo);
    var a1 = ((blo >>> 16) | 0);
    var b0 = (65535 & lo);
    var b1 = ((lo >>> 16) | 0);
    var a0b0 = Math.imul(a0, b0);
    var a1b0 = Math.imul(a1, b0);
    var a0b1 = Math.imul(a0, b1);
    var lo$1 = ((a0b0 + (((a1b0 + a0b1) | 0) << 16)) | 0);
    var c1part = ((((a0b0 >>> 16) | 0) + a0b1) | 0);
    var hi$1 = ((((((((Math.imul(blo, hi) + Math.imul(bhi, lo)) | 0) + Math.imul(a1, b1)) | 0) + ((c1part >>> 16) | 0)) | 0) + (((((65535 & c1part) + a1b0) | 0) >>> 16) | 0)) | 0);
    var lo$2 = ((alo - lo$1) | 0);
    var hi$2 = ((((ahi - hi$1) | 0) - (((lo$2 >>> 0) > (alo >>> 0)) | 0)) | 0);
    if ((hi$2 < 0)) {
      var lo$3 = ((lo$2 + blo) | 0);
      var hi$3 = ((((hi$2 + bhi) | 0) + (((lo$3 >>> 0) < (lo$2 >>> 0)) | 0)) | 0);
      return $bL(lo$3, hi$3);
    } else {
      return $bL(lo$2, hi$2);
    }
  } else if (((ahi === bhi) ? ((alo >>> 0) < (blo >>> 0)) : ((ahi >>> 0) < (bhi >>> 0)))) {
    return $bL(alo, ahi);
  } else {
    var lo$4 = ((alo - blo) | 0);
    var hi$4 = ((((ahi - bhi) | 0) - (((lo$4 >>> 0) > (alo >>> 0)) | 0)) | 0);
    return $bL(lo$4, hi$4);
  }
});
var $d_RTLong$ = new $TypeData().i($c_RTLong$, "org.scalajs.linker.runtime.RuntimeLong$", ({
  bJ: 1
}));
var $n_RTLong$;
function $m_RTLong$() {
  if ((!$n_RTLong$)) {
    $n_RTLong$ = new $c_RTLong$();
  }
  return $n_RTLong$;
}
/** @constructor */
function $c_s_$less$colon$less$() {
  this.du = null;
  $n_s_$less$colon$less$ = this;
  this.du = new $c_s_$less$colon$less$$anon$1();
}
$p = $c_s_$less$colon$less$.prototype = new $h_O();
$p.constructor = $c_s_$less$colon$less$;
/** @constructor */
function $h_s_$less$colon$less$() {
}
$h_s_$less$colon$less$.prototype = $p;
var $d_s_$less$colon$less$ = new $TypeData().i($c_s_$less$colon$less$, "scala.$less$colon$less$", ({
  bM: 1
}));
var $n_s_$less$colon$less$;
function $m_s_$less$colon$less$() {
  if ((!$n_s_$less$colon$less$)) {
    $n_s_$less$colon$less$ = new $c_s_$less$colon$less$();
  }
  return $n_s_$less$colon$less$;
}
function $p_s_Array$__slowcopy__O__I__O__I__I__V($thiz, src, srcPos, dest, destPos, length) {
  var i = srcPos;
  var j = destPos;
  var srcUntil = ((srcPos + length) | 0);
  while ((i < srcUntil)) {
    $m_sr_ScalaRunTime$().g5(dest, j, $m_sr_ScalaRunTime$().gZ(src, i));
    i = ((1 + i) | 0);
    j = ((1 + j) | 0);
  }
}
/** @constructor */
function $c_s_Array$() {
}
$p = $c_s_Array$.prototype = new $h_O();
$p.constructor = $c_s_Array$;
/** @constructor */
function $h_s_Array$() {
}
$h_s_Array$.prototype = $p;
$p.f8 = (function(src, srcPos, dest, destPos, length) {
  var srcClass = $objectGetClass(src);
  if ((srcClass.be.Z && $objectGetClass(dest).be.R(srcClass.be))) {
    src.j(srcPos, dest, destPos, length);
  } else {
    $p_s_Array$__slowcopy__O__I__O__I__I__V(this, src, srcPos, dest, destPos, length);
  }
});
var $d_s_Array$ = new $TypeData().i($c_s_Array$, "scala.Array$", ({
  bO: 1
}));
var $n_s_Array$;
function $m_s_Array$() {
  if ((!$n_s_Array$)) {
    $n_s_Array$ = new $c_s_Array$();
  }
  return $n_s_Array$;
}
/** @constructor */
function $c_s_Array$EmptyArrays$() {
  this.eL = null;
  this.ft = null;
  $n_s_Array$EmptyArrays$ = this;
  this.eL = new $ac_I(0);
  this.ft = new $ac_O(0);
}
$p = $c_s_Array$EmptyArrays$.prototype = new $h_O();
$p.constructor = $c_s_Array$EmptyArrays$;
/** @constructor */
function $h_s_Array$EmptyArrays$() {
}
$h_s_Array$EmptyArrays$.prototype = $p;
var $d_s_Array$EmptyArrays$ = new $TypeData().i($c_s_Array$EmptyArrays$, "scala.Array$EmptyArrays$", ({
  bP: 1
}));
var $n_s_Array$EmptyArrays$;
function $m_s_Array$EmptyArrays$() {
  if ((!$n_s_Array$EmptyArrays$)) {
    $n_s_Array$EmptyArrays$ = new $c_s_Array$EmptyArrays$();
  }
  return $n_s_Array$EmptyArrays$;
}
/** @constructor */
function $c_s_LowPriorityImplicits2() {
}
$p = $c_s_LowPriorityImplicits2.prototype = new $h_O();
$p.constructor = $c_s_LowPriorityImplicits2;
/** @constructor */
function $h_s_LowPriorityImplicits2() {
}
$h_s_LowPriorityImplicits2.prototype = $p;
/** @constructor */
function $c_sc_Hashing$() {
}
$p = $c_sc_Hashing$.prototype = new $h_O();
$p.constructor = $c_sc_Hashing$;
/** @constructor */
function $h_sc_Hashing$() {
}
$h_sc_Hashing$.prototype = $p;
$p.b9 = (function(hcode) {
  var h = ((hcode + (~(hcode << 9))) | 0);
  h = (h ^ ((h >>> 14) | 0));
  h = ((h + (h << 4)) | 0);
  return (h ^ ((h >>> 10) | 0));
});
var $d_sc_Hashing$ = new $TypeData().i($c_sc_Hashing$, "scala.collection.Hashing$", ({
  c0: 1
}));
var $n_sc_Hashing$;
function $m_sc_Hashing$() {
  if ((!$n_sc_Hashing$)) {
    $n_sc_Hashing$ = new $c_sc_Hashing$();
  }
  return $n_sc_Hashing$;
}
function $f_sc_IterableOnceOps__foreach__F1__V($thiz, f) {
  var it = $thiz.k();
  while (it.m()) {
    f.f(it.g());
  }
}
function $f_sc_IterableOnceOps__forall__F1__Z($thiz, p) {
  var res = true;
  var it = $thiz.k();
  while ((res && it.m())) {
    res = (!(!p.f(it.g())));
  }
  return res;
}
function $f_sc_IterableOnceOps__isEmpty__Z($thiz) {
  var x30 = $thiz.r();
  if ((x30 === (-1))) {
    return (!$thiz.k().m());
  }
  if ((x30 === 0)) {
    return true;
  }
  return false;
}
function $f_sc_IterableOnceOps__size__I($thiz) {
  if (($thiz.r() >= 0)) {
    return $thiz.r();
  } else {
    var it = $thiz.k();
    var len = 0;
    while (it.m()) {
      len = ((1 + len) | 0);
      it.g();
    }
    return len;
  }
}
function $f_sc_IterableOnceOps__copyToArray__O__I__I__I($thiz, dest, start, n) {
  var it = $thiz.k();
  var i = start;
  matchResult18: {
    var srclen;
    var x31 = $thiz.r();
    if ((x31 === (-1))) {
      var srclen = $m_jl_reflect_Array$().e1(dest);
      break matchResult18;
    }
    var srclen = x31;
  }
  var destLen = $m_jl_reflect_Array$().e1(dest);
  var limit = ((n < srclen) ? n : srclen);
  var capacity = ((start < 0) ? destLen : ((destLen - start) | 0));
  var total = ((capacity < limit) ? capacity : limit);
  var end = ((start + ((total < 0) ? 0 : total)) | 0);
  while (((i < end) && it.m())) {
    $m_sr_ScalaRunTime$().g5(dest, i, it.g());
    i = ((1 + i) | 0);
  }
  return ((i - start) | 0);
}
function $f_sc_IterableOnceOps__mkString__T__T__T__T($thiz, start, sep, end) {
  return (($thiz.r() === 0) ? (("" + start) + end) : $thiz.dV($ct_scm_StringBuilder__(new $c_scm_StringBuilder()), start, sep, end).aM.o);
}
function $f_sc_IterableOnceOps__addString__scm_StringBuilder__T__T__T__scm_StringBuilder($thiz, b, start, sep, end) {
  var jsb = b.aM;
  if ((start.length !== 0)) {
    jsb.o = (("" + jsb.o) + start);
  }
  var it = $thiz.k();
  if (it.m()) {
    var obj = it.g();
    jsb.o = (("" + jsb.o) + obj);
    while (it.m()) {
      if ((sep.length !== 0)) {
        jsb.o = (("" + jsb.o) + sep);
      }
      var obj$1 = it.g();
      jsb.o = (("" + jsb.o) + obj$1);
    }
  }
  if ((end.length !== 0)) {
    jsb.o = (("" + jsb.o) + end);
  }
  return b;
}
/** @constructor */
function $c_sc_Iterator$ConcatIteratorCell(head, tail) {
  this.fB = null;
  this.dx = null;
  this.fB = head;
  this.dx = tail;
}
$p = $c_sc_Iterator$ConcatIteratorCell.prototype = new $h_O();
$p.constructor = $c_sc_Iterator$ConcatIteratorCell;
/** @constructor */
function $h_sc_Iterator$ConcatIteratorCell() {
}
$h_sc_Iterator$ConcatIteratorCell.prototype = $p;
$p.hv = (function() {
  return this.fB.aw().k();
});
var $d_sc_Iterator$ConcatIteratorCell = new $TypeData().i($c_sc_Iterator$ConcatIteratorCell, "scala.collection.Iterator$ConcatIteratorCell", ({
  c8: 1
}));
/** @constructor */
function $c_sc_StringOps$() {
  this.fE = null;
  $n_sc_StringOps$ = this;
  this.fE = new $c_sr_AbstractFunction1_$$Lambda$7afc3dd0acc1681fb022ef921c83979087aaa919(((_$1$2) => this.fE));
}
$p = $c_sc_StringOps$.prototype = new $h_O();
$p.constructor = $c_sc_StringOps$;
/** @constructor */
function $h_sc_StringOps$() {
}
$h_sc_StringOps$.prototype = $p;
var $d_sc_StringOps$ = new $TypeData().i($c_sc_StringOps$, "scala.collection.StringOps$", ({
  ce: 1
}));
var $n_sc_StringOps$;
function $m_sc_StringOps$() {
  if ((!$n_sc_StringOps$)) {
    $n_sc_StringOps$ = new $c_sc_StringOps$();
  }
  return $n_sc_StringOps$;
}
/** @constructor */
function $c_scg_CommonErrors$() {
}
$p = $c_scg_CommonErrors$.prototype = new $h_O();
$p.constructor = $c_scg_CommonErrors$;
/** @constructor */
function $h_scg_CommonErrors$() {
}
$h_scg_CommonErrors$.prototype = $p;
$p.fg = (function(index, max) {
  return $ct_jl_IndexOutOfBoundsException__T__(new $c_jl_IndexOutOfBoundsException(), (((index + " is out of bounds (min 0, max ") + max) + ")"));
});
var $d_scg_CommonErrors$ = new $TypeData().i($c_scg_CommonErrors$, "scala.collection.generic.CommonErrors$", ({
  ch: 1
}));
var $n_scg_CommonErrors$;
function $m_scg_CommonErrors$() {
  if ((!$n_scg_CommonErrors$)) {
    $n_scg_CommonErrors$ = new $c_scg_CommonErrors$();
  }
  return $n_scg_CommonErrors$;
}
/** @constructor */
function $c_sci_IndexedSeqDefaults$() {
  this.fG = 0;
  $n_sci_IndexedSeqDefaults$ = this;
  try {
    $m_sc_StringOps$();
    var $x_1 = $m_jl_Integer$().gp($m_jl_System$SystemProperties$().fe("scala.collection.immutable.IndexedSeq.defaultApplyPreferredMaxLength", "64"), 10, 214748364);
  } catch (e) {
    if (false) {
      var $x_1 = 64;
    } else {
      var $x_1;
      throw e;
    }
  }
  this.fG = $x_1;
}
$p = $c_sci_IndexedSeqDefaults$.prototype = new $h_O();
$p.constructor = $c_sci_IndexedSeqDefaults$;
/** @constructor */
function $h_sci_IndexedSeqDefaults$() {
}
$h_sci_IndexedSeqDefaults$.prototype = $p;
var $d_sci_IndexedSeqDefaults$ = new $TypeData().i($c_sci_IndexedSeqDefaults$, "scala.collection.immutable.IndexedSeqDefaults$", ({
  co: 1
}));
var $n_sci_IndexedSeqDefaults$;
function $m_sci_IndexedSeqDefaults$() {
  if ((!$n_sci_IndexedSeqDefaults$)) {
    $n_sci_IndexedSeqDefaults$ = new $c_sci_IndexedSeqDefaults$();
  }
  return $n_sci_IndexedSeqDefaults$;
}
/** @constructor */
function $c_sci_LazyList$EmptyMarker$() {
}
$p = $c_sci_LazyList$EmptyMarker$.prototype = new $h_O();
$p.constructor = $c_sci_LazyList$EmptyMarker$;
/** @constructor */
function $h_sci_LazyList$EmptyMarker$() {
}
$h_sci_LazyList$EmptyMarker$.prototype = $p;
var $d_sci_LazyList$EmptyMarker$ = new $TypeData().i($c_sci_LazyList$EmptyMarker$, "scala.collection.immutable.LazyList$EmptyMarker$", ({
  cr: 1
}));
var $n_sci_LazyList$EmptyMarker$;
function $m_sci_LazyList$EmptyMarker$() {
  if ((!$n_sci_LazyList$EmptyMarker$)) {
    $n_sci_LazyList$EmptyMarker$ = new $c_sci_LazyList$EmptyMarker$();
  }
  return $n_sci_LazyList$EmptyMarker$;
}
/** @constructor */
function $c_sci_LazyList$LazyBuilder$DeferredState() {
  this.eQ = null;
}
$p = $c_sci_LazyList$LazyBuilder$DeferredState.prototype = new $h_O();
$p.constructor = $c_sci_LazyList$LazyBuilder$DeferredState;
/** @constructor */
function $h_sci_LazyList$LazyBuilder$DeferredState() {
}
$h_sci_LazyList$LazyBuilder$DeferredState.prototype = $p;
$p.fa = (function() {
  var state = this.eQ;
  if ((state === null)) {
    throw new $c_jl_IllegalStateException("uninitialized");
  }
  return state.aw();
});
$p.fh = (function(state) {
  if ((this.eQ !== null)) {
    throw new $c_jl_IllegalStateException("already initialized");
  }
  this.eQ = state;
});
var $d_sci_LazyList$LazyBuilder$DeferredState = new $TypeData().i($c_sci_LazyList$LazyBuilder$DeferredState, "scala.collection.immutable.LazyList$LazyBuilder$DeferredState", ({
  ct: 1
}));
/** @constructor */
function $c_sci_LazyList$MidEvaluation$() {
}
$p = $c_sci_LazyList$MidEvaluation$.prototype = new $h_O();
$p.constructor = $c_sci_LazyList$MidEvaluation$;
/** @constructor */
function $h_sci_LazyList$MidEvaluation$() {
}
$h_sci_LazyList$MidEvaluation$.prototype = $p;
var $d_sci_LazyList$MidEvaluation$ = new $TypeData().i($c_sci_LazyList$MidEvaluation$, "scala.collection.immutable.LazyList$MidEvaluation$", ({
  cv: 1
}));
var $n_sci_LazyList$MidEvaluation$;
function $m_sci_LazyList$MidEvaluation$() {
  if ((!$n_sci_LazyList$MidEvaluation$)) {
    $n_sci_LazyList$MidEvaluation$ = new $c_sci_LazyList$MidEvaluation$();
  }
  return $n_sci_LazyList$MidEvaluation$;
}
/** @constructor */
function $c_sci_MapNode$() {
  this.fJ = null;
  $n_sci_MapNode$ = this;
  $m_s_reflect_ManifestFactory$IntManifest$();
  this.fJ = new $c_sci_BitmapIndexedMapNode(0, 0, new $ac_O(0), new $ac_I(0), 0, 0);
}
$p = $c_sci_MapNode$.prototype = new $h_O();
$p.constructor = $c_sci_MapNode$;
/** @constructor */
function $h_sci_MapNode$() {
}
$h_sci_MapNode$.prototype = $p;
var $d_sci_MapNode$ = new $TypeData().i($c_sci_MapNode$, "scala.collection.immutable.MapNode$", ({
  cL: 1
}));
var $n_sci_MapNode$;
function $m_sci_MapNode$() {
  if ((!$n_sci_MapNode$)) {
    $n_sci_MapNode$ = new $c_sci_MapNode$();
  }
  return $n_sci_MapNode$;
}
function $p_sci_Node__arrayIndexOutOfBounds__O__I__jl_ArrayIndexOutOfBoundsException($thiz, as, ix) {
  return $ct_jl_ArrayIndexOutOfBoundsException__T__(new $c_jl_ArrayIndexOutOfBoundsException(), ((ix + " is out of bounds (min 0, max ") + (($m_jl_reflect_Array$().e1(as) - 1) | 0)));
}
/** @constructor */
function $c_sci_Node() {
}
$p = $c_sci_Node.prototype = new $h_O();
$p.constructor = $c_sci_Node;
/** @constructor */
function $h_sci_Node() {
}
$h_sci_Node.prototype = $p;
$p.fl = (function(as, ix) {
  if ((ix < 0)) {
    throw $p_sci_Node__arrayIndexOutOfBounds__O__I__jl_ArrayIndexOutOfBoundsException(this, as, ix);
  }
  if ((ix > ((as.a.length - 1) | 0))) {
    throw $p_sci_Node__arrayIndexOutOfBounds__O__I__jl_ArrayIndexOutOfBoundsException(this, as, ix);
  }
  var result = new $ac_I(((as.a.length - 1) | 0));
  as.j(0, result, 0, ix);
  var srcPos = ((1 + ix) | 0);
  var length = ((((as.a.length - ix) | 0) - 1) | 0);
  as.j(srcPos, result, ix, length);
  return result;
});
$p.gn = (function(as, ix, elem) {
  if ((ix < 0)) {
    throw $p_sci_Node__arrayIndexOutOfBounds__O__I__jl_ArrayIndexOutOfBoundsException(this, as, ix);
  }
  if ((ix > as.a.length)) {
    throw $p_sci_Node__arrayIndexOutOfBounds__O__I__jl_ArrayIndexOutOfBoundsException(this, as, ix);
  }
  var result = new $ac_I(((1 + as.a.length) | 0));
  as.j(0, result, 0, ix);
  result.a[ix] = elem;
  var destPos = ((1 + ix) | 0);
  var length = ((as.a.length - ix) | 0);
  as.j(ix, result, destPos, length);
  return result;
});
var $d_sci_Node = new $TypeData().i(0, "scala.collection.immutable.Node", ({
  am: 1
}));
/** @constructor */
function $c_sci_Node$() {
  this.dG = 0;
  $n_sci_Node$ = this;
  this.dG = $doubleToInt((+Math.ceil(6.4)));
}
$p = $c_sci_Node$.prototype = new $h_O();
$p.constructor = $c_sci_Node$;
/** @constructor */
function $h_sci_Node$() {
}
$h_sci_Node$.prototype = $p;
$p.bV = (function(hash, shift) {
  return (31 & ((hash >>> shift) | 0));
});
$p.bI = (function(mask) {
  return (1 << mask);
});
$p.hx = (function(bitmap, bitpos) {
  return $m_jl_Integer$().bS((bitmap & ((bitpos - 1) | 0)));
});
$p.bi = (function(bitmap, mask, bitpos) {
  return ((bitmap === (-1)) ? mask : this.hx(bitmap, bitpos));
});
var $d_sci_Node$ = new $TypeData().i($c_sci_Node$, "scala.collection.immutable.Node$", ({
  cO: 1
}));
var $n_sci_Node$;
function $m_sci_Node$() {
  if ((!$n_sci_Node$)) {
    $n_sci_Node$ = new $c_sci_Node$();
  }
  return $n_sci_Node$;
}
function $p_sci_VectorSliceBuilder__addSlice__I__AO__I__I__V($thiz, n, a, lo, hi) {
  var hi$tailLocal1 = hi;
  var lo$tailLocal1 = lo;
  var a$tailLocal1 = a;
  var n$tailLocal1 = n;
  while (true) {
    if ((n$tailLocal1 === 1)) {
      var a$1 = a$tailLocal1;
      var start = lo$tailLocal1;
      var end = hi$tailLocal1;
      $p_sci_VectorSliceBuilder__add__I__AO__V($thiz, 1, (((start | (end ^ a$1.a.length)) === 0) ? a$1 : $m_ju_Arrays$().t(a$1, start, end)));
      return (void 0);
    } else {
      var bitsN = Math.imul(5, ((n$tailLocal1 - 1) | 0));
      var widthN = (1 << bitsN);
      var loN = ((lo$tailLocal1 >>> bitsN) | 0);
      var hiN = ((hi$tailLocal1 >>> bitsN) | 0);
      var loRest = (lo$tailLocal1 & ((widthN - 1) | 0));
      var hiRest = (hi$tailLocal1 & ((widthN - 1) | 0));
      if ((loRest === 0)) {
        if ((hiRest === 0)) {
          var $x_1 = n$tailLocal1;
          var a$2 = a$tailLocal1;
          $p_sci_VectorSliceBuilder__add__I__AO__V($thiz, $x_1, (((loN | (hiN ^ a$2.a.length)) === 0) ? a$2 : $m_ju_Arrays$().t(a$2, loN, hiN)));
          return (void 0);
        } else {
          if ((hiN > loN)) {
            var $x_2 = n$tailLocal1;
            var a$3 = a$tailLocal1;
            $p_sci_VectorSliceBuilder__add__I__AO__V($thiz, $x_2, (((loN | (hiN ^ a$3.a.length)) === 0) ? a$3 : $m_ju_Arrays$().t(a$3, loN, hiN)));
          }
          var n$tailLocal1$tmp1 = ((n$tailLocal1 - 1) | 0);
          var a$tailLocal1$tmp1 = a$tailLocal1.a[hiN];
          n$tailLocal1 = n$tailLocal1$tmp1;
          a$tailLocal1 = a$tailLocal1$tmp1;
          lo$tailLocal1 = 0;
          hi$tailLocal1 = hiRest;
        }
      } else if ((hiN === loN)) {
        var n$tailLocal1$tmp2 = ((n$tailLocal1 - 1) | 0);
        var a$tailLocal1$tmp2 = a$tailLocal1.a[loN];
        n$tailLocal1 = n$tailLocal1$tmp2;
        a$tailLocal1 = a$tailLocal1$tmp2;
        lo$tailLocal1 = loRest;
        hi$tailLocal1 = hiRest;
      } else {
        $p_sci_VectorSliceBuilder__addSlice__I__AO__I__I__V($thiz, ((n$tailLocal1 - 1) | 0), a$tailLocal1.a[loN], loRest, widthN);
        if ((hiRest === 0)) {
          if ((hiN > ((1 + loN) | 0))) {
            var $x_3 = n$tailLocal1;
            var a$4 = a$tailLocal1;
            var start$1 = ((1 + loN) | 0);
            $p_sci_VectorSliceBuilder__add__I__AO__V($thiz, $x_3, (((start$1 | (hiN ^ a$4.a.length)) === 0) ? a$4 : $m_ju_Arrays$().t(a$4, start$1, hiN)));
            return (void 0);
          } else {
            return (void 0);
          }
        } else {
          if ((hiN > ((1 + loN) | 0))) {
            var $x_4 = n$tailLocal1;
            var a$5 = a$tailLocal1;
            var start$2 = ((1 + loN) | 0);
            $p_sci_VectorSliceBuilder__add__I__AO__V($thiz, $x_4, (((start$2 | (hiN ^ a$5.a.length)) === 0) ? a$5 : $m_ju_Arrays$().t(a$5, start$2, hiN)));
          }
          var n$tailLocal1$tmp3 = ((n$tailLocal1 - 1) | 0);
          var a$tailLocal1$tmp3 = a$tailLocal1.a[hiN];
          n$tailLocal1 = n$tailLocal1$tmp3;
          a$tailLocal1 = a$tailLocal1$tmp3;
          lo$tailLocal1 = 0;
          hi$tailLocal1 = hiRest;
        }
      }
    }
  }
}
function $p_sci_VectorSliceBuilder__add__I__AO__V($thiz, n, a) {
  if ((n <= $thiz.b5)) {
    var idx = ((11 - n) | 0);
  } else {
    $thiz.b5 = n;
    var idx = ((n - 1) | 0);
  }
  $thiz.n.a[idx] = a;
}
function $p_sci_VectorSliceBuilder__balancePrefix__I__V($thiz, n) {
  if (($thiz.n.a[((n - 1) | 0)] === null)) {
    if ((n === $thiz.b5)) {
      $thiz.n.a[((n - 1) | 0)] = $thiz.n.a[((11 - n) | 0)];
      $thiz.n.a[((11 - n) | 0)] = null;
    } else {
      $p_sci_VectorSliceBuilder__balancePrefix__I__V($thiz, ((1 + n) | 0));
      var preN1 = $thiz.n.a[((((1 + n) | 0) - 1) | 0)];
      $thiz.n.a[((n - 1) | 0)] = preN1.a[0];
      if ((preN1.a.length === 1)) {
        $thiz.n.a[((((1 + n) | 0) - 1) | 0)] = null;
        if ((($thiz.b5 === ((1 + n) | 0)) && ($thiz.n.a[((11 - ((1 + n) | 0)) | 0)] === null))) {
          $thiz.b5 = n;
        }
      } else {
        $thiz.n.a[((((1 + n) | 0) - 1) | 0)] = $m_ju_Arrays$().t(preN1, 1, preN1.a.length);
      }
    }
  }
}
function $p_sci_VectorSliceBuilder__balanceSuffix__I__V($thiz, n) {
  if (($thiz.n.a[((11 - n) | 0)] === null)) {
    if ((n === $thiz.b5)) {
      $thiz.n.a[((11 - n) | 0)] = $thiz.n.a[((n - 1) | 0)];
      $thiz.n.a[((n - 1) | 0)] = null;
    } else {
      $p_sci_VectorSliceBuilder__balanceSuffix__I__V($thiz, ((1 + n) | 0));
      var sufN1 = $thiz.n.a[((11 - ((1 + n) | 0)) | 0)];
      $thiz.n.a[((11 - n) | 0)] = sufN1.a[((sufN1.a.length - 1) | 0)];
      if ((sufN1.a.length === 1)) {
        $thiz.n.a[((11 - ((1 + n) | 0)) | 0)] = null;
        if ((($thiz.b5 === ((1 + n) | 0)) && ($thiz.n.a[((((1 + n) | 0) - 1) | 0)] === null))) {
          $thiz.b5 = n;
        }
      } else {
        $thiz.n.a[((11 - ((1 + n) | 0)) | 0)] = $m_ju_Arrays$().t(sufN1, 0, ((sufN1.a.length - 1) | 0));
      }
    }
  }
}
/** @constructor */
function $c_sci_VectorSliceBuilder(lo, hi) {
  this.eV = 0;
  this.eU = 0;
  this.n = null;
  this.bO = 0;
  this.db = 0;
  this.b5 = 0;
  this.eV = lo;
  this.eU = hi;
  this.n = new ($d_O.r().r().C)(11);
  this.bO = 0;
  this.db = 0;
  this.b5 = 0;
}
$p = $c_sci_VectorSliceBuilder.prototype = new $h_O();
$p.constructor = $c_sci_VectorSliceBuilder;
/** @constructor */
function $h_sci_VectorSliceBuilder() {
}
$h_sci_VectorSliceBuilder.prototype = $p;
$p.E = (function(n, a) {
  var count = Math.imul(a.a.length, (1 << Math.imul(5, ((n - 1) | 0))));
  var a$1 = ((this.eV - this.db) | 0);
  var lo0 = ((a$1 > 0) ? a$1 : 0);
  var a$2 = ((this.eU - this.db) | 0);
  var hi0 = ((a$2 < count) ? a$2 : count);
  if ((hi0 > lo0)) {
    $p_sci_VectorSliceBuilder__addSlice__I__AO__I__I__V(this, n, a, lo0, hi0);
    this.bO = ((this.bO + ((hi0 - lo0) | 0)) | 0);
  }
  this.db = ((this.db + count) | 0);
});
$p.cc = (function() {
  if ((this.bO <= 32)) {
    if ((this.bO === 0)) {
      return $m_sci_Vector0$();
    } else {
      var prefix1 = this.n.a[0];
      var suffix1 = this.n.a[10];
      if ((prefix1 !== null)) {
        if ((suffix1 !== null)) {
          var dest = $m_ju_Arrays$().O(prefix1, ((prefix1.a.length + suffix1.a.length) | 0));
          var destPos = prefix1.a.length;
          var length = suffix1.a.length;
          suffix1.j(0, dest, destPos, length);
          var $x_1 = dest;
        } else {
          var $x_1 = prefix1;
        }
      } else if ((suffix1 !== null)) {
        var $x_1 = suffix1;
      } else {
        var prefix2 = this.n.a[1];
        var $x_1 = ((prefix2 !== null) ? prefix2.a[0] : this.n.a[9].a[0]);
      }
      return new $c_sci_Vector1($x_1);
    }
  } else {
    $p_sci_VectorSliceBuilder__balancePrefix__I__V(this, 1);
    $p_sci_VectorSliceBuilder__balanceSuffix__I__V(this, 1);
    var resultDim = this.b5;
    if ((resultDim < 6)) {
      var pre = this.n.a[((this.b5 - 1) | 0)];
      var suf = this.n.a[((11 - this.b5) | 0)];
      if (((pre !== null) && (suf !== null))) {
        if ((((pre.a.length + suf.a.length) | 0) <= 30)) {
          var $x_3 = this.n;
          var $x_2 = this.b5;
          var dest$1 = $m_ju_Arrays$().O(pre, ((pre.a.length + suf.a.length) | 0));
          var destPos$1 = pre.a.length;
          var length$1 = suf.a.length;
          suf.j(0, dest$1, destPos$1, length$1);
          $x_3.a[(($x_2 - 1) | 0)] = dest$1;
          this.n.a[((11 - this.b5) | 0)] = null;
        } else {
          resultDim = ((1 + resultDim) | 0);
        }
      } else {
        var one = ((pre !== null) ? pre : suf);
        if ((one === null)) {
          $m_sr_Scala3RunTime$().cr();
        }
        if ((one.a.length > 30)) {
          resultDim = ((1 + resultDim) | 0);
        }
      }
    }
    var x$proxy1 = this.n.a[0];
    if ((x$proxy1 === null)) {
      $m_sr_Scala3RunTime$().cr();
    }
    var x$proxy2 = this.n.a[10];
    if ((x$proxy2 === null)) {
      $m_sr_Scala3RunTime$().cr();
    }
    var len1 = x$proxy1.a.length;
    var x27 = resultDim;
    switch (x27) {
      case 2: {
        var a$1 = $m_sci_VectorStatics$().ai;
        var p = this.n.a[1];
        if ((p !== null)) {
          var $x_4 = p;
        } else {
          var s = this.n.a[9];
          var $x_4 = ((s !== null) ? s : a$1);
        }
        return new $c_sci_Vector2(x$proxy1, len1, $x_4, x$proxy2, this.bO);
        break;
      }
      case 3: {
        var a$2 = $m_sci_VectorStatics$().ai;
        var p$1 = this.n.a[1];
        var prefix2$2 = ((p$1 !== null) ? p$1 : a$2);
        var a$3 = $m_sci_VectorStatics$().aR;
        var p$2 = this.n.a[2];
        if ((p$2 !== null)) {
          var $x_5 = p$2;
        } else {
          var s$1 = this.n.a[8];
          var $x_5 = ((s$1 !== null) ? s$1 : a$3);
        }
        var a$4 = $m_sci_VectorStatics$().ai;
        var s$2 = this.n.a[9];
        return new $c_sci_Vector3(x$proxy1, len1, prefix2$2, ((len1 + (prefix2$2.a.length << 5)) | 0), $x_5, ((s$2 !== null) ? s$2 : a$4), x$proxy2, this.bO);
        break;
      }
      case 4: {
        var a$5 = $m_sci_VectorStatics$().ai;
        var p$3 = this.n.a[1];
        var prefix2$3 = ((p$3 !== null) ? p$3 : a$5);
        var a$6 = $m_sci_VectorStatics$().aR;
        var p$4 = this.n.a[2];
        var prefix3 = ((p$4 !== null) ? p$4 : a$6);
        var a$7 = $m_sci_VectorStatics$().bP;
        var p$5 = this.n.a[3];
        if ((p$5 !== null)) {
          var $x_6 = p$5;
        } else {
          var s$3 = this.n.a[7];
          var $x_6 = ((s$3 !== null) ? s$3 : a$7);
        }
        var data4 = $x_6;
        var a$8 = $m_sci_VectorStatics$().aR;
        var s$4 = this.n.a[8];
        var suffix3 = ((s$4 !== null) ? s$4 : a$8);
        var a$9 = $m_sci_VectorStatics$().ai;
        var s$5 = this.n.a[9];
        var suffix2$3 = ((s$5 !== null) ? s$5 : a$9);
        var len12$2 = ((len1 + (prefix2$3.a.length << 5)) | 0);
        return new $c_sci_Vector4(x$proxy1, len1, prefix2$3, len12$2, prefix3, ((len12$2 + (prefix3.a.length << 10)) | 0), data4, suffix3, suffix2$3, x$proxy2, this.bO);
        break;
      }
      case 5: {
        var a$10 = $m_sci_VectorStatics$().ai;
        var p$6 = this.n.a[1];
        var prefix2$4 = ((p$6 !== null) ? p$6 : a$10);
        var a$11 = $m_sci_VectorStatics$().aR;
        var p$7 = this.n.a[2];
        var prefix3$2 = ((p$7 !== null) ? p$7 : a$11);
        var a$12 = $m_sci_VectorStatics$().bP;
        var p$8 = this.n.a[3];
        var prefix4 = ((p$8 !== null) ? p$8 : a$12);
        var a$13 = $m_sci_VectorStatics$().dc;
        var p$9 = this.n.a[4];
        if ((p$9 !== null)) {
          var $x_7 = p$9;
        } else {
          var s$6 = this.n.a[6];
          var $x_7 = ((s$6 !== null) ? s$6 : a$13);
        }
        var data5 = $x_7;
        var a$14 = $m_sci_VectorStatics$().bP;
        var s$7 = this.n.a[7];
        var suffix4 = ((s$7 !== null) ? s$7 : a$14);
        var a$15 = $m_sci_VectorStatics$().aR;
        var s$8 = this.n.a[8];
        var suffix3$2 = ((s$8 !== null) ? s$8 : a$15);
        var a$16 = $m_sci_VectorStatics$().ai;
        var s$9 = this.n.a[9];
        var suffix2$4 = ((s$9 !== null) ? s$9 : a$16);
        var len12$3 = ((len1 + (prefix2$4.a.length << 5)) | 0);
        var len123$2 = ((len12$3 + (prefix3$2.a.length << 10)) | 0);
        return new $c_sci_Vector5(x$proxy1, len1, prefix2$4, len12$3, prefix3$2, len123$2, prefix4, ((len123$2 + (prefix4.a.length << 15)) | 0), data5, suffix4, suffix3$2, suffix2$4, x$proxy2, this.bO);
        break;
      }
      case 6: {
        var a$17 = $m_sci_VectorStatics$().ai;
        var p$10 = this.n.a[1];
        var prefix2$5 = ((p$10 !== null) ? p$10 : a$17);
        var a$18 = $m_sci_VectorStatics$().aR;
        var p$11 = this.n.a[2];
        var prefix3$3 = ((p$11 !== null) ? p$11 : a$18);
        var a$19 = $m_sci_VectorStatics$().bP;
        var p$12 = this.n.a[3];
        var prefix4$2 = ((p$12 !== null) ? p$12 : a$19);
        var a$20 = $m_sci_VectorStatics$().dc;
        var p$13 = this.n.a[4];
        var prefix5 = ((p$13 !== null) ? p$13 : a$20);
        var a$21 = $m_sci_VectorStatics$().eX;
        var p$14 = this.n.a[5];
        if ((p$14 !== null)) {
          var $x_8 = p$14;
        } else {
          var s$10 = this.n.a[5];
          var $x_8 = ((s$10 !== null) ? s$10 : a$21);
        }
        var data6 = $x_8;
        var a$22 = $m_sci_VectorStatics$().dc;
        var s$11 = this.n.a[6];
        var suffix5 = ((s$11 !== null) ? s$11 : a$22);
        var a$23 = $m_sci_VectorStatics$().bP;
        var s$12 = this.n.a[7];
        var suffix4$2 = ((s$12 !== null) ? s$12 : a$23);
        var a$24 = $m_sci_VectorStatics$().aR;
        var s$13 = this.n.a[8];
        var suffix3$3 = ((s$13 !== null) ? s$13 : a$24);
        var a$25 = $m_sci_VectorStatics$().ai;
        var s$14 = this.n.a[9];
        var suffix2$5 = ((s$14 !== null) ? s$14 : a$25);
        var len12$4 = ((len1 + (prefix2$5.a.length << 5)) | 0);
        var len123$3 = ((len12$4 + (prefix3$3.a.length << 10)) | 0);
        var len1234$2 = ((len123$3 + (prefix4$2.a.length << 15)) | 0);
        return new $c_sci_Vector6(x$proxy1, len1, prefix2$5, len12$4, prefix3$3, len123$3, prefix4$2, len1234$2, prefix5, ((len1234$2 + (prefix5.a.length << 20)) | 0), data6, suffix5, suffix4$2, suffix3$3, suffix2$5, x$proxy2, this.bO);
        break;
      }
      default: {
        throw new $c_s_MatchError(x27);
      }
    }
  }
});
$p.A = (function() {
  return (((((((((("VectorSliceBuilder(lo=" + this.eV) + ", hi=") + this.eU) + ", len=") + this.bO) + ", pos=") + this.db) + ", maxDim=") + this.b5) + ")");
});
var $d_sci_VectorSliceBuilder = new $TypeData().i($c_sci_VectorSliceBuilder, "scala.collection.immutable.VectorSliceBuilder", ({
  d6: 1
}));
/** @constructor */
function $c_sci_VectorStatics$() {
  this.eW = null;
  this.ai = null;
  this.aR = null;
  this.bP = null;
  this.dc = null;
  this.eX = null;
  $n_sci_VectorStatics$ = this;
  this.eW = new $ac_O(0);
  this.ai = new ($d_O.r().r().C)(0);
  this.aR = new ($d_O.r().r().r().C)(0);
  this.bP = new ($d_O.r().r().r().r().C)(0);
  this.dc = new ($d_O.r().r().r().r().r().C)(0);
  this.eX = new ($d_O.r().r().r().r().r().r().C)(0);
}
$p = $c_sci_VectorStatics$.prototype = new $h_O();
$p.constructor = $c_sci_VectorStatics$;
/** @constructor */
function $h_sci_VectorStatics$() {
}
$h_sci_VectorStatics$.prototype = $p;
$p.dj = (function(a, elem) {
  var alen = a.a.length;
  var ac = new $ac_O(((1 + alen) | 0));
  a.j(0, ac, 0, alen);
  ac.a[alen] = elem;
  return ac;
});
$p.s = (function(a, elem) {
  var ac = $m_ju_Arrays$().O(a, ((1 + a.a.length) | 0));
  ac.a[((ac.a.length - 1) | 0)] = elem;
  return ac;
});
$p.c8 = (function(elem, a) {
  var ac = $objectGetClass(a).be.Q().be.U(((1 + a.a.length) | 0));
  var length$1 = a.a.length;
  a.j(0, ac, 1, length$1);
  ac.a[0] = elem;
  return ac;
});
$p.ey = (function(level, a, f) {
  var i = 0;
  var len = a.a.length;
  if ((level === 0)) {
    while ((i < len)) {
      f.f(a.a[i]);
      i = ((1 + i) | 0);
    }
  } else {
    var l = ((level - 1) | 0);
    while ((i < len)) {
      this.ey(l, a.a[i], f);
      i = ((1 + i) | 0);
    }
  }
});
$p.bJ = (function(a, f) {
  var i = 0;
  while ((i < a.a.length)) {
    var v1 = a.a[i];
    var v2 = f.f(v1);
    if ((!Object.is(v1, v2))) {
      return this.hJ(a, f, i, v2);
    }
    i = ((1 + i) | 0);
  }
  return a;
});
$p.hJ = (function(a, f, at, v2) {
  var ac = new $ac_O(a.a.length);
  if ((at > 0)) {
    a.j(0, ac, 0, at);
  }
  ac.a[at] = v2;
  var i = ((1 + at) | 0);
  while ((i < a.a.length)) {
    ac.a[i] = f.f(a.a[i]);
    i = ((1 + i) | 0);
  }
  return ac;
});
$p.Y = (function(n, a, f) {
  if ((n === 1)) {
    return this.bJ(a, f);
  } else {
    var i = 0;
    while ((i < a.a.length)) {
      var v1 = a.a[i];
      var v2 = this.Y(((n - 1) | 0), v1, f);
      if ((v1 !== v2)) {
        return this.hK(n, a, f, i, v2);
      }
      i = ((1 + i) | 0);
    }
    return a;
  }
});
$p.hK = (function(n, a, f, at, v2) {
  var ac = $objectGetClass(a).be.Q().be.U(a.a.length);
  if ((at > 0)) {
    a.j(0, ac, 0, at);
  }
  ac.a[at] = v2;
  var i = ((1 + at) | 0);
  while ((i < a.a.length)) {
    ac.a[i] = this.Y(((n - 1) | 0), a.a[i], f);
    i = ((1 + i) | 0);
  }
  return ac;
});
var $d_sci_VectorStatics$ = new $TypeData().i($c_sci_VectorStatics$, "scala.collection.immutable.VectorStatics$", ({
  d7: 1
}));
var $n_sci_VectorStatics$;
function $m_sci_VectorStatics$() {
  if ((!$n_sci_VectorStatics$)) {
    $n_sci_VectorStatics$ = new $c_sci_VectorStatics$();
  }
  return $n_sci_VectorStatics$;
}
/** @constructor */
function $c_scm_MutationTracker$() {
}
$p = $c_scm_MutationTracker$.prototype = new $h_O();
$p.constructor = $c_scm_MutationTracker$;
/** @constructor */
function $h_scm_MutationTracker$() {
}
$h_scm_MutationTracker$.prototype = $p;
$p.g7 = (function(expectedCount, actualCount, message) {
  if ((actualCount !== expectedCount)) {
    throw new $c_ju_ConcurrentModificationException(message);
  }
});
var $d_scm_MutationTracker$ = new $TypeData().i($c_scm_MutationTracker$, "scala.collection.mutable.MutationTracker$", ({
  dn: 1
}));
var $n_scm_MutationTracker$;
function $m_scm_MutationTracker$() {
  if ((!$n_scm_MutationTracker$)) {
    $n_scm_MutationTracker$ = new $c_scm_MutationTracker$();
  }
  return $n_scm_MutationTracker$;
}
/** @constructor */
function $c_sr_BoxesRunTime$() {
}
$p = $c_sr_BoxesRunTime$.prototype = new $h_O();
$p.constructor = $c_sr_BoxesRunTime$;
/** @constructor */
function $h_sr_BoxesRunTime$() {
}
$h_sr_BoxesRunTime$.prototype = $p;
$p.h = (function(x, y) {
  return ((x === y) || ($is_jl_Number(x) ? this.hj(x, y) : ((x instanceof $Char) ? this.hh(x, y) : ((x === null) ? (y === null) : $dp_equals__O__Z(x, y)))));
});
$p.hj = (function(xn, y) {
  if ($is_jl_Number(y)) {
    return this.hi(xn, y);
  } else if ((y instanceof $Char)) {
    if (((typeof xn) === "number")) {
      return ((+xn) === y.c);
    } else if ((xn instanceof $Long)) {
      var $x_1 = $uJ(xn);
      var x3_$_lo = $x_1.l;
      var x3_$_hi = $x_1.h;
      var value = y.c;
      var hi = (value >> 31);
      return (((x3_$_lo ^ value) | (x3_$_hi ^ hi)) === 0);
    } else {
      return ((xn === null) ? (y === null) : $dp_equals__O__Z(xn, y));
    }
  } else {
    return ((xn === null) ? (y === null) : $dp_equals__O__Z(xn, y));
  }
});
$p.hi = (function(xn, yn) {
  if (((typeof xn) === "number")) {
    var x2 = (+xn);
    if (((typeof yn) === "number")) {
      return (x2 === (+yn));
    } else if ((yn instanceof $Long)) {
      var $x_1 = $uJ(yn);
      var x3_$_lo = $x_1.l;
      var x3_$_hi = $x_1.h;
      return (x2 === ((4.294967296E9 * x3_$_hi) + (x3_$_lo >>> 0.0)));
    } else {
      return (false && yn.P(x2));
    }
  } else if ((xn instanceof $Long)) {
    var $x_2 = $uJ(xn);
    var x3$2_$_lo = $x_2.l;
    var x3$2_$_hi = $x_2.h;
    if ((yn instanceof $Long)) {
      var $x_3 = $uJ(yn);
      var x2$3_$_lo = $x_3.l;
      var x2$3_$_hi = $x_3.h;
      return (((x3$2_$_lo ^ x2$3_$_lo) | (x3$2_$_hi ^ x2$3_$_hi)) === 0);
    } else if (((typeof yn) === "number")) {
      var x3$3 = (+yn);
      return (((4.294967296E9 * x3$2_$_hi) + (x3$2_$_lo >>> 0.0)) === x3$3);
    } else {
      return (false && yn.P($bL(x3$2_$_lo, x3$2_$_hi)));
    }
  } else {
    return ((xn === null) ? (yn === null) : $dp_equals__O__Z(xn, yn));
  }
});
$p.hh = (function(xc, y) {
  if ((y instanceof $Char)) {
    return (xc.c === y.c);
  } else if ($is_jl_Number(y)) {
    if (((typeof y) === "number")) {
      return ((+y) === xc.c);
    } else if ((y instanceof $Long)) {
      var $x_1 = $uJ(y);
      var x3_$_lo = $x_1.l;
      var x3_$_hi = $x_1.h;
      var value = xc.c;
      var hi = (value >> 31);
      return (((x3_$_lo ^ value) | (x3_$_hi ^ hi)) === 0);
    } else {
      return ((y === null) ? (xc === null) : $dp_equals__O__Z(y, xc));
    }
  } else {
    return ((xc === null) && (y === null));
  }
});
var $d_sr_BoxesRunTime$ = new $TypeData().i($c_sr_BoxesRunTime$, "scala.runtime.BoxesRunTime$", ({
  dJ: 1
}));
var $n_sr_BoxesRunTime$;
function $m_sr_BoxesRunTime$() {
  if ((!$n_sr_BoxesRunTime$)) {
    $n_sr_BoxesRunTime$ = new $c_sr_BoxesRunTime$();
  }
  return $n_sr_BoxesRunTime$;
}
/** @constructor */
function $c_sr_Scala3RunTime$() {
}
$p = $c_sr_Scala3RunTime$.prototype = new $h_O();
$p.constructor = $c_sr_Scala3RunTime$;
/** @constructor */
function $h_sr_Scala3RunTime$() {
}
$h_sr_Scala3RunTime$.prototype = $p;
$p.cr = (function() {
  throw $ct_jl_NullPointerException__T__(new $c_jl_NullPointerException(), "tried to cast away nullability, but value is null");
});
var $d_sr_Scala3RunTime$ = new $TypeData().i($c_sr_Scala3RunTime$, "scala.runtime.Scala3RunTime$", ({
  dN: 1
}));
var $n_sr_Scala3RunTime$;
function $m_sr_Scala3RunTime$() {
  if ((!$n_sr_Scala3RunTime$)) {
    $n_sr_Scala3RunTime$ = new $c_sr_Scala3RunTime$();
  }
  return $n_sr_Scala3RunTime$;
}
/** @constructor */
function $c_sr_ScalaRunTime$() {
}
$p = $c_sr_ScalaRunTime$.prototype = new $h_O();
$p.constructor = $c_sr_ScalaRunTime$;
/** @constructor */
function $h_sr_ScalaRunTime$() {
}
$h_sr_ScalaRunTime$.prototype = $p;
$p.gZ = (function(xs, idx) {
  if ((xs instanceof $ac_O)) {
    return xs.a[idx];
  }
  if ((xs instanceof $ac_I)) {
    return xs.a[idx];
  }
  if ((xs instanceof $ac_D)) {
    return xs.a[idx];
  }
  if ((xs instanceof $ac_J)) {
    var $x_1 = xs.a;
    var $x_2 = (idx << 1);
    return $bL($x_1[$x_2], $x_1[(($x_2 + 1) | 0)]);
  }
  if ((xs instanceof $ac_F)) {
    return xs.a[idx];
  }
  if ((xs instanceof $ac_C)) {
    return $bC(xs.a[idx]);
  }
  if ((xs instanceof $ac_B)) {
    return xs.a[idx];
  }
  if ((xs instanceof $ac_S)) {
    return xs.a[idx];
  }
  if ((xs instanceof $ac_Z)) {
    return xs.a[idx];
  }
  if ((xs === null)) {
    throw $ct_jl_NullPointerException__(new $c_jl_NullPointerException());
  }
  throw new $c_s_MatchError(xs);
});
$p.g5 = (function(xs, idx, value) {
  if ((xs instanceof $ac_O)) {
    xs.a[idx] = value;
    return (void 0);
  }
  if ((xs instanceof $ac_I)) {
    xs.a[idx] = (value | 0);
    return (void 0);
  }
  if ((xs instanceof $ac_D)) {
    xs.a[idx] = (+value);
    return (void 0);
  }
  if ((xs instanceof $ac_J)) {
    var $x_1 = $uJ(value);
    var $x_2 = xs.a;
    var $x_3 = (idx << 1);
    $x_2[$x_3] = $x_1.l;
    $x_2[(($x_3 + 1) | 0)] = $x_1.h;
    return (void 0);
  }
  if ((xs instanceof $ac_F)) {
    xs.a[idx] = Math.fround(value);
    return (void 0);
  }
  if ((xs instanceof $ac_C)) {
    xs.a[idx] = $uC(value);
    return (void 0);
  }
  if ((xs instanceof $ac_B)) {
    xs.a[idx] = (value | 0);
    return (void 0);
  }
  if ((xs instanceof $ac_S)) {
    xs.a[idx] = (value | 0);
    return (void 0);
  }
  if ((xs instanceof $ac_Z)) {
    xs.a[idx] = (!(!value));
    return (void 0);
  }
  if ((xs === null)) {
    throw $ct_jl_NullPointerException__(new $c_jl_NullPointerException());
  }
  throw new $c_s_MatchError(xs);
});
$p.cW = (function(x) {
  return $f_sc_IterableOnceOps__mkString__T__T__T__T(x.bK(), (x.bd() + "("), ",", ")");
});
var $d_sr_ScalaRunTime$ = new $TypeData().i($c_sr_ScalaRunTime$, "scala.runtime.ScalaRunTime$", ({
  dO: 1
}));
var $n_sr_ScalaRunTime$;
function $m_sr_ScalaRunTime$() {
  if ((!$n_sr_ScalaRunTime$)) {
    $n_sr_ScalaRunTime$ = new $c_sr_ScalaRunTime$();
  }
  return $n_sr_ScalaRunTime$;
}
/** @constructor */
function $c_sr_Statics$() {
}
$p = $c_sr_Statics$.prototype = new $h_O();
$p.constructor = $c_sr_Statics$;
/** @constructor */
function $h_sr_Statics$() {
}
$h_sr_Statics$.prototype = $p;
$p.y = (function(hash, data) {
  var h = this.cq(hash, data);
  var i = h;
  h = ((i << 13) | ((i >>> 19) | 0));
  return ((Math.imul(5, h) - 430675100) | 0);
});
$p.cq = (function(hash, data) {
  var k = data;
  k = Math.imul((-862048943), k);
  var i = k;
  k = ((i << 15) | ((i >>> 17) | 0));
  k = Math.imul(461845907, k);
  return (hash ^ k);
});
$p.aU = (function(hash, length) {
  return this.h0((hash ^ length));
});
$p.h0 = (function(h0) {
  var h = h0;
  h = (h ^ ((h >>> 16) | 0));
  h = Math.imul((-2048144789), h);
  h = (h ^ ((h >>> 13) | 0));
  h = Math.imul((-1028477387), h);
  h = (h ^ ((h >>> 16) | 0));
  return h;
});
$p.hG = (function(lv_$_lo, lv_$_hi) {
  return ((lv_$_hi === (lv_$_lo >> 31)) ? lv_$_lo : (lv_$_lo ^ lv_$_hi));
});
$p.gd = (function(dv) {
  var iv = $doubleToInt(dv);
  if ((iv === dv)) {
    return iv;
  } else {
    var $x_1 = $m_RTLong$().gk(dv);
    var lv_$_lo = $x_1.l;
    var lv_$_hi = $x_1.h;
    if ((((4.294967296E9 * lv_$_hi) + (lv_$_lo >>> 0.0)) === dv)) {
      return (lv_$_lo ^ lv_$_hi);
    } else {
      var valueInt = (dv | 0);
      if (((valueInt === dv) && ((1.0 / dv) !== (-Infinity)))) {
        return valueInt;
      } else if ((dv !== dv)) {
        return 2146959360;
      } else {
        var fpBitsDataView = $fpBitsDataView;
        fpBitsDataView.setFloat64(0, dv, true);
        return ((fpBitsDataView.getInt32(0, true) | 0) ^ (fpBitsDataView.getInt32(4, true) | 0));
      }
    }
  }
});
$p.aj = (function(x) {
  if ((x === null)) {
    return 0;
  } else if (((typeof x) === "number")) {
    return this.gd((+x));
  } else if ((x instanceof $Long)) {
    var $x_1 = $uJ(x);
    return this.hG($x_1.l, $x_1.h);
  } else {
    return $dp_hashCode__I(x);
  }
});
$p.hB = (function(n) {
  throw $ct_jl_IndexOutOfBoundsException__T__(new $c_jl_IndexOutOfBoundsException(), ("" + n));
});
var $d_sr_Statics$ = new $TypeData().i($c_sr_Statics$, "scala.runtime.Statics$", ({
  dQ: 1
}));
var $n_sr_Statics$;
function $m_sr_Statics$() {
  if ((!$n_sr_Statics$)) {
    $n_sr_Statics$ = new $c_sr_Statics$();
  }
  return $n_sr_Statics$;
}
/** @constructor */
function $c_sjs_js_special_package$() {
}
$p = $c_sjs_js_special_package$.prototype = new $h_O();
$p.constructor = $c_sjs_js_special_package$;
/** @constructor */
function $h_sjs_js_special_package$() {
}
$h_sjs_js_special_package$.prototype = $p;
$p.hU = (function(properties) {
  var result = ({});
  properties.dl(new $c_sr_AbstractFunction1_$$Lambda$7afc3dd0acc1681fb022ef921c83979087aaa919(((pair$2$2) => {
    result[pair$2$2.az] = pair$2$2.aA;
  })));
  return result;
});
var $d_sjs_js_special_package$ = new $TypeData().i($c_sjs_js_special_package$, "scala.scalajs.js.special.package$", ({
  dT: 1
}));
var $n_sjs_js_special_package$;
function $m_sjs_js_special_package$() {
  if ((!$n_sjs_js_special_package$)) {
    $n_sjs_js_special_package$ = new $c_sjs_js_special_package$();
  }
  return $n_sjs_js_special_package$;
}
/** @constructor */
function $c_sjsr_Compat$() {
}
$p = $c_sjsr_Compat$.prototype = new $h_O();
$p.constructor = $c_sjsr_Compat$;
/** @constructor */
function $h_sjsr_Compat$() {
}
$h_sjsr_Compat$.prototype = $p;
$p.il = (function(seq) {
  if ((seq instanceof $c_sjsr_WrappedVarArgs)) {
    return seq.em;
  } else {
    var result = [];
    seq.dl(new $c_sr_AbstractFunction1_$$Lambda$7afc3dd0acc1681fb022ef921c83979087aaa919(((x$2$2) => (result.push(x$2$2) | 0))));
    return result;
  }
});
var $d_sjsr_Compat$ = new $TypeData().i($c_sjsr_Compat$, "scala.scalajs.runtime.Compat$", ({
  dU: 1
}));
var $n_sjsr_Compat$;
function $m_sjsr_Compat$() {
  if ((!$n_sjsr_Compat$)) {
    $n_sjsr_Compat$ = new $c_sjsr_Compat$();
  }
  return $n_sjsr_Compat$;
}
/** @constructor */
function $c_s_util_DynamicVariable(init) {
  this.f1 = null;
  this.f1 = init;
}
$p = $c_s_util_DynamicVariable.prototype = new $h_O();
$p.constructor = $c_s_util_DynamicVariable;
/** @constructor */
function $h_s_util_DynamicVariable() {
}
$h_s_util_DynamicVariable.prototype = $p;
$p.A = (function() {
  return (("DynamicVariable(" + this.f1) + ")");
});
var $d_s_util_DynamicVariable = new $TypeData().i($c_s_util_DynamicVariable, "scala.util.DynamicVariable", ({
  dW: 1
}));
/** @constructor */
function $c_s_util_hashing_MurmurHash3() {
}
$p = $c_s_util_hashing_MurmurHash3.prototype = new $h_O();
$p.constructor = $c_s_util_hashing_MurmurHash3;
/** @constructor */
function $h_s_util_hashing_MurmurHash3() {
}
$h_s_util_hashing_MurmurHash3.prototype = $p;
$p.y = (function(hash, data) {
  var h = this.cq(hash, data);
  var i = h;
  h = ((i << 13) | ((i >>> 19) | 0));
  return ((Math.imul(5, h) - 430675100) | 0);
});
$p.cq = (function(hash, data) {
  var k = data;
  k = Math.imul((-862048943), k);
  var i = k;
  k = ((i << 15) | ((i >>> 17) | 0));
  k = Math.imul(461845907, k);
  return (hash ^ k);
});
$p.aU = (function(hash, length) {
  return this.eG((hash ^ length));
});
$p.eG = (function(hash) {
  var h = hash;
  h = (h ^ ((h >>> 16) | 0));
  h = Math.imul((-2048144789), h);
  h = (h ^ ((h >>> 13) | 0));
  h = Math.imul((-1028477387), h);
  h = (h ^ ((h >>> 16) | 0));
  return h;
});
$p.gA = (function(x, y, seed) {
  var h = seed;
  h = this.y(h, $f_T__hashCode__I("Tuple2"));
  h = this.y(h, x);
  h = this.y(h, y);
  return this.aU(h, 2);
});
$p.d1 = (function(x, seed, ignorePrefix) {
  var arr = x.bb();
  if ((arr === 0)) {
    return ((!ignorePrefix) ? $f_T__hashCode__I(x.bd()) : seed);
  } else {
    var h = seed;
    if ((!ignorePrefix)) {
      h = this.y(h, $f_T__hashCode__I(x.bd()));
    }
    var i = 0;
    while ((i < arr)) {
      h = this.y(h, $m_sr_Statics$().aj(x.bc(i)));
      i = ((1 + i) | 0);
    }
    return this.aU(h, arr);
  }
});
$p.gB = (function(xs, seed) {
  var a = 0;
  var b = 0;
  var n = 0;
  var c = 1;
  var iterator = xs.k();
  while (iterator.m()) {
    var x = iterator.g();
    var h = $m_sr_Statics$().aj(x);
    a = ((a + h) | 0);
    b = (b ^ h);
    c = Math.imul(c, (1 | h));
    n = ((1 + n) | 0);
  }
  var h$2 = seed;
  h$2 = this.y(h$2, a);
  h$2 = this.y(h$2, b);
  h$2 = this.cq(h$2, c);
  return this.aU(h$2, n);
});
$p.hV = (function(xs, seed) {
  var it = xs.k();
  var h = seed;
  if ((!it.m())) {
    return this.aU(h, 0);
  }
  var x0 = it.g();
  if ((!it.m())) {
    return this.aU(this.y(h, $m_sr_Statics$().aj(x0)), 1);
  }
  var x1 = it.g();
  var initial = $m_sr_Statics$().aj(x0);
  h = this.y(h, initial);
  var h0 = h;
  var prev = $m_sr_Statics$().aj(x1);
  var rangeDiff = ((prev - initial) | 0);
  var i = 2;
  while (it.m()) {
    h = this.y(h, prev);
    var hash = $m_sr_Statics$().aj(it.g());
    if (((rangeDiff !== ((hash - prev) | 0)) || (rangeDiff === 0))) {
      h = this.y(h, hash);
      i = ((1 + i) | 0);
      while (it.m()) {
        h = this.y(h, $m_sr_Statics$().aj(it.g()));
        i = ((1 + i) | 0);
      }
      return this.aU(h, i);
    }
    prev = hash;
    i = ((1 + i) | 0);
  }
  return this.eG(this.y(this.y(h0, rangeDiff), prev));
});
$p.i1 = (function(start, step, last, seed) {
  return this.eG(this.y(this.y(this.y(seed, start), step), last));
});
$p.hy = (function(a, seed) {
  var h = seed;
  var l = a.p();
  switch (l) {
    case 0: {
      return this.aU(h, 0);
      break;
    }
    case 1: {
      return this.aU(this.y(h, $m_sr_Statics$().aj(a.x(0))), 1);
      break;
    }
    default: {
      var initial = $m_sr_Statics$().aj(a.x(0));
      h = this.y(h, initial);
      var h0 = h;
      var prev = $m_sr_Statics$().aj(a.x(1));
      var rangeDiff = ((prev - initial) | 0);
      var i = 2;
      while ((i < l)) {
        h = this.y(h, prev);
        var hash = $m_sr_Statics$().aj(a.x(i));
        if (((rangeDiff !== ((hash - prev) | 0)) || (rangeDiff === 0))) {
          h = this.y(h, hash);
          i = ((1 + i) | 0);
          while ((i < l)) {
            h = this.y(h, $m_sr_Statics$().aj(a.x(i)));
            i = ((1 + i) | 0);
          }
          return this.aU(h, l);
        }
        prev = hash;
        i = ((1 + i) | 0);
      }
      return this.eG(this.y(this.y(h0, rangeDiff), prev));
    }
  }
});
$p.hF = (function(xs, seed) {
  var n = 0;
  var h = seed;
  var rangeState = 0;
  var rangeDiff = 0;
  var prev = 0;
  var initial = 0;
  var elems = xs;
  while ((!elems.l())) {
    var head = elems.w();
    var tail = elems.F();
    var hash = $m_sr_Statics$().aj(head);
    h = this.y(h, hash);
    switch (rangeState) {
      case 0: {
        initial = hash;
        rangeState = 1;
        break;
      }
      case 1: {
        rangeDiff = ((hash - prev) | 0);
        rangeState = 2;
        break;
      }
      case 2: {
        if (((rangeDiff !== ((hash - prev) | 0)) || (rangeDiff === 0))) {
          rangeState = 3;
        }
        break;
      }
    }
    prev = hash;
    n = ((1 + n) | 0);
    elems = tail;
  }
  return ((rangeState === 2) ? this.i1(initial, rangeDiff, prev, seed) : this.aU(h, n));
});
/** @constructor */
function $c_Lsculpter_AST$() {
}
$p = $c_Lsculpter_AST$.prototype = new $h_O();
$p.constructor = $c_Lsculpter_AST$;
/** @constructor */
function $h_Lsculpter_AST$() {
}
$h_Lsculpter_AST$.prototype = $p;
$p.gb = (function(token) {
  return ((token.dR !== null) ? new $c_Lsculpter_NumberExpr((+token.dR)) : new $c_Lsculpter_NumberExpr(($m_sc_StringOps$(), $m_jl_Double$().gq(token.dh))));
});
var $d_Lsculpter_AST$ = new $TypeData().i($c_Lsculpter_AST$, "sculpter.AST$", ({
  e0: 1
}));
var $n_Lsculpter_AST$;
function $m_Lsculpter_AST$() {
  if ((!$n_Lsculpter_AST$)) {
    $n_Lsculpter_AST$ = new $c_Lsculpter_AST$();
  }
  return $n_Lsculpter_AST$;
}
function $ct_Lsculpter_Interpreter__($thiz) {
  var $x_1;
  var $x_1 = $m_sci_Map$EmptyMap$();
  $thiz.i = $f_sci_Map__withDefaultValue__O__sci_Map($x_1, $m_sci_Nil$());
  $thiz.dO = $m_sci_Nil$();
  $thiz.aS = 0;
  return $thiz;
}
function $p_Lsculpter_Interpreter__execute__Lsculpter_Statement__V($thiz, statement) {
  if ((statement instanceof $c_Lsculpter_UnaryStatement)) {
    $p_Lsculpter_Interpreter__executeUnary__Lsculpter_TokenType__Lsculpter_Expr__V($thiz, statement.dT, statement.dS);
    return (void 0);
  }
  if ((statement instanceof $c_Lsculpter_BinaryStatement)) {
    $p_Lsculpter_Interpreter__executeBinary__Lsculpter_TokenType__Lsculpter_Expr__Lsculpter_Expr__V($thiz, statement.dM, statement.dL, statement.dN);
    return (void 0);
  }
  throw new $c_s_MatchError(statement);
}
function $p_Lsculpter_Interpreter__ensureStackExists__T__V($thiz, name) {
  if ((!$thiz.i.cK(name))) {
    $thiz.i = $thiz.i.aa(name, $m_sci_Nil$());
  }
}
function $p_Lsculpter_Interpreter__executeUnary__Lsculpter_TokenType__Lsculpter_Expr__V($thiz, operation, operand) {
  var x = $s_Lsculpter_TokenType$__QUESTION__Lsculpter_TokenType();
  if (((x === null) ? (operation === null) : (x === operation))) {
    if ((operand instanceof $c_Lsculpter_StackExpr)) {
      var x20 = operand.aT;
      $p_Lsculpter_Interpreter__ensureStackExists__T__V($thiz, x20);
      if ((!$thiz.i.f(x20).l())) {
        var value = $thiz.i.f(x20).w();
        $thiz.i = $thiz.i.aa(x20, $thiz.i.f(x20).F());
        if (($m_s_None$() === value)) {
          $thiz.aS = ((1 + $thiz.aS) | 0);
          return (void 0);
        }
        if ((value instanceof $c_s_Some)) {
          if (((+value.aV) < 0.0)) {
            $thiz.aS = ((1 + $thiz.aS) | 0);
            return (void 0);
          } else {
            return (void 0);
          }
        }
        throw new $c_s_MatchError(value);
      } else {
        throw $ct_jl_RuntimeException__T__(new $c_jl_RuntimeException(), ("Cannot QUESTION from empty stack " + x20));
      }
    } else {
      var x14 = $p_Lsculpter_Interpreter__evaluateExpr__Lsculpter_Expr__s_Option($thiz, operand);
      if (($m_s_None$() === x14)) {
        $thiz.aS = ((1 + $thiz.aS) | 0);
        return (void 0);
      }
      if ((x14 instanceof $c_s_Some)) {
        if (((+x14.aV) < 0.0)) {
          $thiz.aS = ((1 + $thiz.aS) | 0);
          return (void 0);
        } else {
          return (void 0);
        }
      }
      throw new $c_s_MatchError(x14);
    }
  }
  var x$7 = $s_Lsculpter_TokenType$__POP__Lsculpter_TokenType();
  if (((x$7 === null) ? (operation === null) : (x$7 === operation))) {
    if ((operand instanceof $c_Lsculpter_StackExpr)) {
      var x24 = operand.aT;
      $p_Lsculpter_Interpreter__ensureStackExists__T__V($thiz, x24);
      if ((!$thiz.i.f(x24).l())) {
        $thiz.i = $thiz.i.aa(x24, $thiz.i.f(x24).F());
        return (void 0);
      } else {
        return (void 0);
      }
    }
    throw $ct_jl_RuntimeException__T__(new $c_jl_RuntimeException(), "Cannot POP from non-stack expression");
  }
  var x$9 = $s_Lsculpter_TokenType$__DUP__Lsculpter_TokenType();
  if (((x$9 === null) ? (operation === null) : (x$9 === operation))) {
    if ((operand instanceof $c_Lsculpter_StackExpr)) {
      var x28 = operand.aT;
      $p_Lsculpter_Interpreter__ensureStackExists__T__V($thiz, x28);
      if ((!$thiz.i.f(x28).l())) {
        $thiz.i = $thiz.i.aa(x28, new $c_sci_$colon$colon($thiz.i.f(x28).w(), $thiz.i.f(x28)));
        return (void 0);
      } else {
        $thiz.i = $thiz.i.aa(x28, new $c_sci_$colon$colon($m_s_None$(), $thiz.i.f(x28)));
        return (void 0);
      }
    }
    throw $ct_jl_RuntimeException__T__(new $c_jl_RuntimeException(), "Cannot DUP from non-stack expression");
  }
  var x$11 = $s_Lsculpter_TokenType$__NEG__Lsculpter_TokenType();
  if (((x$11 === null) ? (operation === null) : (x$11 === operation))) {
    if ((operand instanceof $c_Lsculpter_StackExpr)) {
      var x35 = operand.aT;
      $p_Lsculpter_Interpreter__ensureStackExists__T__V($thiz, x35);
      if ((!$thiz.i.f(x35).l())) {
        var x29 = $thiz.i.f(x35).w();
        if ((x29 instanceof $c_s_Some)) {
          var value$3 = (+x29.aV);
          $thiz.i = $thiz.i.aa(x35, new $c_sci_$colon$colon(new $c_s_Some((-value$3)), $thiz.i.f(x35).F()));
          return (void 0);
        }
        if (($m_s_None$() === x29)) {
          throw $ct_jl_RuntimeException__T__(new $c_jl_RuntimeException(), "Cannot negate nil value");
        }
        throw new $c_s_MatchError(x29);
      } else {
        throw $ct_jl_RuntimeException__T__(new $c_jl_RuntimeException(), ("Cannot NEG from empty stack " + x35));
      }
    }
    throw $ct_jl_RuntimeException__T__(new $c_jl_RuntimeException(), "Cannot NEG from non-stack expression");
  }
  var x$15 = $s_Lsculpter_TokenType$__JMP__Lsculpter_TokenType();
  if (((x$15 === null) ? (operation === null) : (x$15 === operation))) {
    if ((operand instanceof $c_Lsculpter_StackExpr)) {
      var x39 = operand.aT;
      $p_Lsculpter_Interpreter__ensureStackExists__T__V($thiz, x39);
      var contents = $thiz.i.f(x39);
      $thiz.i = $thiz.i.aa(x39, $p_sc_StrictOptimizedLinearSeqOps__loop$2__I__sc_LinearSeq__sc_LinearSeq(contents, 1, contents));
      var offset = contents.dn().ex($m_s_$less$colon$less$().du);
    } else {
      var offset = $p_Lsculpter_Interpreter__evaluateExpr__Lsculpter_Expr__s_Option($thiz, operand);
    }
    if ((offset instanceof $c_s_Some)) {
      var value$4 = (+offset.aV);
      var jump = $doubleToInt(value$4);
      if ((jump <= $thiz.dP.cV.p())) {
        $thiz.aS = (((($thiz.aS + jump) | 0) - 1) | 0);
        return (void 0);
      } else {
        throw $ct_jl_RuntimeException__T__(new $c_jl_RuntimeException(), ("Invalid jump target: " + jump));
      }
    }
    if (($m_s_None$() === offset)) {
      throw $ct_jl_RuntimeException__T__(new $c_jl_RuntimeException(), "Cannot jump to nil");
    }
    throw new $c_s_MatchError(offset);
  }
  var x$19 = $s_Lsculpter_TokenType$__CMP__Lsculpter_TokenType();
  if (((x$19 === null) ? (operation === null) : (x$19 === operation))) {
    if ((operand instanceof $c_Lsculpter_StackExpr)) {
      var x46 = operand.aT;
      $p_Lsculpter_Interpreter__ensureStackExists__T__V($thiz, x46);
      var contents$2 = $thiz.i.f(x46);
      var a = contents$2.dn().ex($m_s_$less$colon$less$().du);
      var b = $p_sc_StrictOptimizedLinearSeqOps__loop$2__I__sc_LinearSeq__sc_LinearSeq(contents$2, 1, contents$2).dn().ex($m_s_$less$colon$less$().du);
      $thiz.i = $thiz.i.aa(x46, new $c_sci_$colon$colon($p_Lsculpter_Interpreter__compare__s_Option__s_Option__s_Option($thiz, a, b), $p_sc_StrictOptimizedLinearSeqOps__loop$2__I__sc_LinearSeq__sc_LinearSeq(contents$2, 2, contents$2)));
      return (void 0);
    }
    throw $ct_jl_RuntimeException__T__(new $c_jl_RuntimeException(), "Operand must be a stack");
  }
  matchAlts1: {
    matchAlts2: {
      var x$21 = $s_Lsculpter_TokenType$__ADD__Lsculpter_TokenType();
      if (((x$21 === null) ? (operation === null) : (x$21 === operation))) {
        break matchAlts2;
      }
      var x$23 = $s_Lsculpter_TokenType$__SUB__Lsculpter_TokenType();
      if (((x$23 === null) ? (operation === null) : (x$23 === operation))) {
        break matchAlts2;
      }
      var x$25 = $s_Lsculpter_TokenType$__MUL__Lsculpter_TokenType();
      if (((x$25 === null) ? (operation === null) : (x$25 === operation))) {
        break matchAlts2;
      }
      var x$27 = $s_Lsculpter_TokenType$__DIV__Lsculpter_TokenType();
      if (((x$27 === null) ? (operation === null) : (x$27 === operation))) {
        break matchAlts2;
      }
      var x$29 = $s_Lsculpter_TokenType$__MOD__Lsculpter_TokenType();
      if (((x$29 === null) ? (operation === null) : (x$29 === operation))) {
        break matchAlts2;
      }
      break matchAlts1;
    }
    if ((operand instanceof $c_Lsculpter_StackExpr)) {
      var x57 = operand.aT;
      $p_Lsculpter_Interpreter__ensureStackExists__T__V($thiz, x57);
      if (($thiz.i.f(x57).p() >= 2)) {
        var _1 = $f_sc_LinearSeqOps__apply__I__O($thiz.i.f(x57), 0);
        var _2 = $f_sc_LinearSeqOps__apply__I__O($thiz.i.f(x57), 1);
        if ((_1 instanceof $c_s_Some)) {
          var a$2 = (+_1.aV);
          if ((_2 instanceof $c_s_Some)) {
            var b$2 = (+_2.aV);
            var $x_2 = $thiz.i;
            var $x_1 = $p_Lsculpter_Interpreter__arithmeticOp__Lsculpter_TokenType__D__D__s_Option($thiz, operation, a$2, b$2);
            var this$19 = $thiz.i.f(x57);
            $thiz.i = $x_2.aa(x57, new $c_sci_$colon$colon($x_1, $p_sc_StrictOptimizedLinearSeqOps__loop$2__I__sc_LinearSeq__sc_LinearSeq(this$19, 2, this$19)));
            return (void 0);
          }
        }
        throw $ct_jl_RuntimeException__T__(new $c_jl_RuntimeException(), "Cannot perform arithmetic on nil values");
      } else {
        throw $ct_jl_RuntimeException__T__(new $c_jl_RuntimeException(), (("Not enough values on stack " + x57) + " for operation"));
      }
    }
    throw $ct_jl_RuntimeException__T__(new $c_jl_RuntimeException(), "Operand must be a stack");
  }
  throw $ct_jl_RuntimeException__T__(new $c_jl_RuntimeException(), ("Unsupported unary operation: " + operation));
}
function $p_Lsculpter_Interpreter__executeBinary__Lsculpter_TokenType__Lsculpter_Expr__Lsculpter_Expr__V($thiz, operation, left, right) {
  var x = $s_Lsculpter_TokenType$__PUSH__Lsculpter_TokenType();
  if (((x === null) ? (operation === null) : (x === operation))) {
    if ((left instanceof $c_Lsculpter_StackExpr)) {
      var x67 = left.aT;
      $p_Lsculpter_Interpreter__ensureStackExists__T__V($thiz, x67);
      if ((right instanceof $c_Lsculpter_NilExpr)) {
        $thiz.i = $thiz.i.aa(x67, new $c_sci_$colon$colon($m_s_None$(), $thiz.i.f(x67)));
        return (void 0);
      }
      if ((right instanceof $c_Lsculpter_NumberExpr)) {
        var x62 = right.co;
        $thiz.i = $thiz.i.aa(x67, new $c_sci_$colon$colon(new $c_s_Some(x62), $thiz.i.f(x67)));
        return (void 0);
      }
      throw $ct_jl_RuntimeException__T__(new $c_jl_RuntimeException(), "Second operand of PUSH must be a literal; use MOV to transfer a value between stacks");
    }
    throw $ct_jl_RuntimeException__T__(new $c_jl_RuntimeException(), "First operand of PUSH must be a stack");
  }
  var x$3 = $s_Lsculpter_TokenType$__MOV__Lsculpter_TokenType();
  if (((x$3 === null) ? (operation === null) : (x$3 === operation))) {
    if ((left instanceof $c_Lsculpter_StackExpr)) {
      var x76 = left.aT;
      if ((right instanceof $c_Lsculpter_StackExpr)) {
        var x73 = right.aT;
        $p_Lsculpter_Interpreter__ensureStackExists__T__V($thiz, x76);
        $p_Lsculpter_Interpreter__ensureStackExists__T__V($thiz, x73);
        if ((!$thiz.i.f(x73).l())) {
          $thiz.i = $thiz.i.aa(x76, new $c_sci_$colon$colon($thiz.i.f(x73).w(), $thiz.i.f(x76))).aa(x73, $thiz.i.f(x73).F());
          return (void 0);
        } else {
          $thiz.i = $thiz.i.aa(x76, new $c_sci_$colon$colon($m_s_None$(), $thiz.i.f(x76)));
          return (void 0);
        }
      }
    }
    throw $ct_jl_RuntimeException__T__(new $c_jl_RuntimeException(), "Both operands of MOV must be stacks");
  }
  var x$5 = $s_Lsculpter_TokenType$__CMP__Lsculpter_TokenType();
  if (((x$5 === null) ? (operation === null) : (x$5 === operation))) {
    if ((left instanceof $c_Lsculpter_StackExpr)) {
      var x85 = left.aT;
      $p_Lsculpter_Interpreter__ensureStackExists__T__V($thiz, x85);
      var contents = $thiz.i.f(x85);
      var a = contents.dn().ex($m_s_$less$colon$less$().du);
      matchResult18: {
        var n;
        if ((right instanceof $c_Lsculpter_NumberExpr)) {
          var n = new $c_s_Some(right.co);
          break matchResult18;
        }
        if ((right instanceof $c_Lsculpter_NilExpr)) {
          var n = $m_s_None$();
          break matchResult18;
        }
        throw $ct_jl_RuntimeException__T__(new $c_jl_RuntimeException(), "Second operand of CMP must be a literal");
      }
      $thiz.i = $thiz.i.aa(x85, new $c_sci_$colon$colon($p_Lsculpter_Interpreter__compare__s_Option__s_Option__s_Option($thiz, a, n), $p_sc_StrictOptimizedLinearSeqOps__loop$2__I__sc_LinearSeq__sc_LinearSeq(contents, 1, contents)));
      return (void 0);
    }
    throw $ct_jl_RuntimeException__T__(new $c_jl_RuntimeException(), "First operand must be a stack");
  }
  matchAlts3: {
    matchAlts4: {
      var x$7 = $s_Lsculpter_TokenType$__ADD__Lsculpter_TokenType();
      if (((x$7 === null) ? (operation === null) : (x$7 === operation))) {
        break matchAlts4;
      }
      var x$9 = $s_Lsculpter_TokenType$__SUB__Lsculpter_TokenType();
      if (((x$9 === null) ? (operation === null) : (x$9 === operation))) {
        break matchAlts4;
      }
      var x$11 = $s_Lsculpter_TokenType$__MUL__Lsculpter_TokenType();
      if (((x$11 === null) ? (operation === null) : (x$11 === operation))) {
        break matchAlts4;
      }
      var x$13 = $s_Lsculpter_TokenType$__DIV__Lsculpter_TokenType();
      if (((x$13 === null) ? (operation === null) : (x$13 === operation))) {
        break matchAlts4;
      }
      var x$15 = $s_Lsculpter_TokenType$__MOD__Lsculpter_TokenType();
      if (((x$15 === null) ? (operation === null) : (x$15 === operation))) {
        break matchAlts4;
      }
      break matchAlts3;
    }
    if ((left instanceof $c_Lsculpter_StackExpr)) {
      var x97 = left.aT;
      $p_Lsculpter_Interpreter__ensureStackExists__T__V($thiz, x97);
      if ($thiz.i.f(x97).l()) {
        throw $ct_jl_RuntimeException__T__(new $c_jl_RuntimeException(), (("Stack " + x97) + " is empty"));
      }
      matchResult20: {
        var rightValue;
        if ((right instanceof $c_Lsculpter_NumberExpr)) {
          var rightValue = right.co;
          break matchResult20;
        }
        if ((right instanceof $c_Lsculpter_NilExpr)) {
          throw $ct_jl_RuntimeException__T__(new $c_jl_RuntimeException(), "Cannot perform arithmetic with nil value");
        }
        throw $ct_jl_RuntimeException__T__(new $c_jl_RuntimeException(), "Second operand of binary arithmetic must be a literal");
      }
      var x91 = $thiz.i.f(x97).w();
      if ((x91 instanceof $c_s_Some)) {
        var stackValue = (+x91.aV);
        $thiz.i = $thiz.i.aa(x97, new $c_sci_$colon$colon($p_Lsculpter_Interpreter__arithmeticOp__Lsculpter_TokenType__D__D__s_Option($thiz, operation, stackValue, rightValue), $thiz.i.f(x97).F()));
        return (void 0);
      }
      if (($m_s_None$() === x91)) {
        throw $ct_jl_RuntimeException__T__(new $c_jl_RuntimeException(), "Cannot perform arithmetic on nil value");
      }
      throw new $c_s_MatchError(x91);
    }
    throw $ct_jl_RuntimeException__T__(new $c_jl_RuntimeException(), "First operand must be a stack");
  }
  throw $ct_jl_RuntimeException__T__(new $c_jl_RuntimeException(), ("Unsupported binary operation: " + operation));
}
function $p_Lsculpter_Interpreter__evaluateExpr__Lsculpter_Expr__s_Option($thiz, expr) {
  if ((expr instanceof $c_Lsculpter_NumberExpr)) {
    return new $c_s_Some(expr.co);
  }
  if ((expr instanceof $c_Lsculpter_StackExpr)) {
    var x103 = expr.aT;
    $p_Lsculpter_Interpreter__ensureStackExists__T__V($thiz, x103);
    return ((!$thiz.i.f(x103).l()) ? $thiz.i.f(x103).w() : $m_s_None$());
  }
  if ((expr instanceof $c_Lsculpter_NilExpr)) {
    return $m_s_None$();
  }
  throw new $c_s_MatchError(expr);
}
function $p_Lsculpter_Interpreter__arithmeticOp__Lsculpter_TokenType__D__D__s_Option($thiz, op, a, b) {
  var x = $s_Lsculpter_TokenType$__ADD__Lsculpter_TokenType();
  if (((x === null) ? (op === null) : (x === op))) {
    return new $c_s_Some((a + b));
  }
  var x$3 = $s_Lsculpter_TokenType$__SUB__Lsculpter_TokenType();
  if (((x$3 === null) ? (op === null) : (x$3 === op))) {
    return new $c_s_Some((a - b));
  }
  var x$5 = $s_Lsculpter_TokenType$__MUL__Lsculpter_TokenType();
  if (((x$5 === null) ? (op === null) : (x$5 === op))) {
    return new $c_s_Some((a * b));
  }
  var x$7 = $s_Lsculpter_TokenType$__DIV__Lsculpter_TokenType();
  if (((x$7 === null) ? (op === null) : (x$7 === op))) {
    return ((b === 0.0) ? $m_s_None$() : new $c_s_Some((a / b)));
  }
  var x$9 = $s_Lsculpter_TokenType$__MOD__Lsculpter_TokenType();
  if (((x$9 === null) ? (op === null) : (x$9 === op))) {
    return ((b === 0.0) ? $m_s_None$() : new $c_s_Some((a % b)));
  }
  throw $ct_jl_RuntimeException__T__(new $c_jl_RuntimeException(), ("Unsupported arithmetic operation: " + op));
}
function $p_Lsculpter_Interpreter__compare__s_Option__s_Option__s_Option($thiz, a, b) {
  if ((a instanceof $c_s_Some)) {
    var x = (+a.aV);
    if ((b instanceof $c_s_Some)) {
      var y = (+b.aV);
      return ((x === y) ? new $c_s_Some(0.0) : ((x < y) ? new $c_s_Some((-1.0)) : new $c_s_Some(1.0)));
    }
  }
  if ((($m_s_None$() === a) && ($m_s_None$() === b))) {
    return new $c_s_Some(1.0);
  }
  return $m_s_None$();
}
/** @constructor */
function $c_Lsculpter_Interpreter() {
  this.i = null;
  this.dO = null;
  this.aS = 0;
  this.dP = null;
}
$p = $c_Lsculpter_Interpreter.prototype = new $h_O();
$p.constructor = $c_Lsculpter_Interpreter;
/** @constructor */
function $h_Lsculpter_Interpreter() {
}
$h_Lsculpter_Interpreter.prototype = $p;
$p.i6 = (function(program) {
  this.dP = program;
  var $x_1;
  var $x_1 = $m_sci_Map$EmptyMap$();
  this.i = $f_sci_Map__withDefaultValue__O__sci_Map($x_1, $m_sci_Nil$());
  this.dO = $m_sci_Nil$();
  this.aS = 0;
});
$p.ih = (function() {
  if ((this.aS >= this.dP.cV.p())) {
    return false;
  }
  this.dO = $f_sc_StrictOptimizedSeqOps__appended__O__O(this.dO, this.i);
  $p_Lsculpter_Interpreter__execute__Lsculpter_Statement__V(this, $f_sc_LinearSeqOps__apply__I__O(this.dP.cV, this.aS));
  this.aS = ((1 + this.aS) | 0);
  return true;
});
/** @constructor */
function $c_Lsculpter_Lexer$() {
  this.dQ = false;
  this.cn = null;
  this.dg = 0;
  this.aX = 0;
  this.cH = 0;
  this.bQ = null;
  $n_Lsculpter_Lexer$ = this;
  this.dQ = false;
  this.cn = $m_sci_Nil$();
  this.dg = 0;
  this.aX = 0;
  this.cH = 1;
  this.bQ = "";
}
$p = $c_Lsculpter_Lexer$.prototype = new $h_O();
$p.constructor = $c_Lsculpter_Lexer$;
/** @constructor */
function $h_Lsculpter_Lexer$() {
}
$h_Lsculpter_Lexer$.prototype = $p;
$p.gX = (function(pSource) {
  this.dQ = false;
  this.cn = $m_sci_Nil$();
  this.dg = 0;
  this.aX = 0;
  this.cH = 1;
  this.bQ = pSource;
  this.cn = this.id();
});
$p.id = (function() {
  $m_sci_Nil$();
  while ((!this.cp())) {
    this.dg = this.aX;
    this.ic();
  }
  var eofToken = new $c_Lsculpter_Token($s_Lsculpter_TokenType$__EOF__Lsculpter_TokenType(), "", null, this.cH);
  this.cn = $f_sc_StrictOptimizedSeqOps__appended__O__O(this.cn, eofToken);
  return this.cn;
});
$p.ic = (function() {
  var c = this.di();
  switch (c) {
    case 63: {
      this.dW($s_Lsculpter_TokenType$__QUESTION__Lsculpter_TokenType(), null);
      break;
    }
    case 45: {
      this.dW($s_Lsculpter_TokenType$__NUM_NEG__Lsculpter_TokenType(), null);
      break;
    }
    case 47: {
      if (this.hM(47)) {
        while (((this.e6() !== 10) && (!this.cp()))) {
          this.di();
        }
      } else {
        this.eF(this.cH, "Unexpected character.", "");
      }
      break;
    }
    case 10: {
      this.cH = ((1 + this.cH) | 0);
      this.dW($s_Lsculpter_TokenType$__ENTER__Lsculpter_TokenType(), null);
      break;
    }
    case 32: {
      break;
    }
    case 13: {
      break;
    }
    case 9: {
      break;
    }
    default: {
      if (this.e3(c)) {
        this.hT();
      } else if (this.go(c)) {
        this.hw();
      } else {
        this.eF(this.cH, "Unexpected character.", "");
      }
    }
  }
});
$p.go = (function(c) {
  return ((((((c - 97) | 0) >>> 0) <= 25) || ((((c - 65) | 0) >>> 0) <= 25)) || (c === 95));
});
$p.hC = (function(c) {
  return (this.go(c) || this.e3(c));
});
$p.hw = (function() {
  while (this.hC(this.e6())) {
    this.di();
  }
  var this$1 = this.bQ;
  var beginIndex = this.dg;
  var endIndex = this.aX;
  var text = this$1.substring(beginIndex, endIndex);
  this.dW($m_Lsculpter_Tokens$package$().fY.cN(text, new $c_sr_AbstractFunction0_$$Lambda$07eded5776954a9c145e92c329afd52873ad179c((() => $s_Lsculpter_TokenType$__STACK__Lsculpter_TokenType()))), null);
});
$p.hT = (function() {
  while (this.e3(this.e6())) {
    this.di();
  }
  if (((this.e6() === 46) && this.e3(this.hY()))) {
    this.di();
    while (this.e3(this.e6())) {
      this.di();
    }
  }
  var $x_2 = $s_Lsculpter_TokenType$__NUMBER__Lsculpter_TokenType();
  $m_sc_StringOps$();
  var $x_1 = $m_jl_Double$();
  var this$1 = this.bQ;
  var beginIndex = this.dg;
  var endIndex = this.aX;
  this.dW($x_2, $x_1.gq(this$1.substring(beginIndex, endIndex)));
});
$p.hY = (function() {
  return ((((1 + this.aX) | 0) >= this.bQ.length) ? 0 : this.bQ.charCodeAt(((1 + this.aX) | 0)));
});
$p.e3 = (function(c) {
  return ((((c - 48) | 0) >>> 0) <= 9);
});
$p.hM = (function(expected) {
  if (this.cp()) {
    return false;
  }
  if ((this.bQ.charCodeAt(this.aX) !== expected)) {
    return false;
  }
  this.aX = ((1 + this.aX) | 0);
  return true;
});
$p.e6 = (function() {
  return (this.cp() ? 0 : this.bQ.charCodeAt(this.aX));
});
$p.di = (function() {
  this.aX = ((1 + this.aX) | 0);
  return this.bQ.charCodeAt(((this.aX - 1) | 0));
});
$p.dW = (function(tokenType, literal) {
  var this$1 = this.bQ;
  var beginIndex = this.dg;
  var endIndex = this.aX;
  var text = this$1.substring(beginIndex, endIndex);
  var token = new $c_Lsculpter_Token(tokenType, text, literal, this.cH);
  this.cn = $f_sc_StrictOptimizedSeqOps__appended__O__O(this.cn, token);
});
$p.cp = (function() {
  return (this.aX >= this.bQ.length);
});
$p.eF = (function(line, message, where) {
  var x = ((((("[line " + line) + "] Error ") + where) + ": ") + message);
  $m_s_Console$().hW().hD((x + "\n"));
  this.dQ = true;
});
$p.hk = (function(token, message) {
  var x = token.aY;
  var x$2 = $s_Lsculpter_TokenType$__EOF__Lsculpter_TokenType();
  if (((x === null) ? (x$2 === null) : (x === x$2))) {
    this.eF(token.es, message, "at end");
  } else {
    this.eF(token.es, message, (("at '" + token.dh) + "'"));
  }
});
var $d_Lsculpter_Lexer$ = new $TypeData().i($c_Lsculpter_Lexer$, "sculpter.Lexer$", ({
  e3: 1
}));
var $n_Lsculpter_Lexer$;
function $m_Lsculpter_Lexer$() {
  if ((!$n_Lsculpter_Lexer$)) {
    $n_Lsculpter_Lexer$ = new $c_Lsculpter_Lexer$();
  }
  return $n_Lsculpter_Lexer$;
}
/** @constructor */
function $c_Lsculpter_Parser$() {
  this.bs = null;
  this.b6 = 0;
  $n_Lsculpter_Parser$ = this;
  this.bs = $m_sci_Nil$();
  this.b6 = 0;
}
$p = $c_Lsculpter_Parser$.prototype = new $h_O();
$p.constructor = $c_Lsculpter_Parser$;
/** @constructor */
function $h_Lsculpter_Parser$() {
}
$h_Lsculpter_Parser$.prototype = $p;
$p.gY = (function(pTokens) {
  this.bs = pTokens;
  this.b6 = 0;
  return this.i0();
});
$p.i0 = (function() {
  var statements = $m_sci_Nil$();
  while ((!this.cp())) {
    try {
      var stmt = this.ig();
      statements = $f_sc_StrictOptimizedSeqOps__appended__O__O(statements, stmt);
    } catch (e) {
      if ((e instanceof $c_Lsculpter_ParseError)) {
        this.ii();
      } else {
        throw e;
      }
    }
  }
  return new $c_Lsculpter_Program(statements);
});
$p.ig = (function() {
  var token = $f_sc_LinearSeqOps__apply__I__O(this.bs, this.b6);
  matchResult1: {
    var $x_1;
    var x1 = token.aY;
    matchAlts5: {
      matchAlts6: {
        var x = $s_Lsculpter_TokenType$__ADD__Lsculpter_TokenType();
        if (((x === null) ? (x1 === null) : (x === x1))) {
          break matchAlts6;
        }
        var x$3 = $s_Lsculpter_TokenType$__SUB__Lsculpter_TokenType();
        if (((x$3 === null) ? (x1 === null) : (x$3 === x1))) {
          break matchAlts6;
        }
        var x$5 = $s_Lsculpter_TokenType$__MUL__Lsculpter_TokenType();
        if (((x$5 === null) ? (x1 === null) : (x$5 === x1))) {
          break matchAlts6;
        }
        var x$7 = $s_Lsculpter_TokenType$__DIV__Lsculpter_TokenType();
        if (((x$7 === null) ? (x1 === null) : (x$7 === x1))) {
          break matchAlts6;
        }
        var x$9 = $s_Lsculpter_TokenType$__MOD__Lsculpter_TokenType();
        if (((x$9 === null) ? (x1 === null) : (x$9 === x1))) {
          break matchAlts6;
        }
        var x$11 = $s_Lsculpter_TokenType$__CMP__Lsculpter_TokenType();
        if (((x$11 === null) ? (x1 === null) : (x$11 === x1))) {
          break matchAlts6;
        }
        break matchAlts5;
      }
      var operator = this.bR();
      var first = this.dX();
      if (((!this.cJ($s_Lsculpter_TokenType$__ENTER__Lsculpter_TokenType())) && (!this.cJ($s_Lsculpter_TokenType$__EOF__Lsculpter_TokenType())))) {
        var x$13 = $f_sc_LinearSeqOps__apply__I__O(this.bs, this.b6).aY;
        var x$14 = $s_Lsculpter_TokenType$__NUMBER__Lsculpter_TokenType();
        if (((x$13 === null) ? (x$14 === null) : (x$13 === x$14))) {
          var $x_3 = true;
        } else {
          var x$15 = $f_sc_LinearSeqOps__apply__I__O(this.bs, this.b6).aY;
          var x$16 = $s_Lsculpter_TokenType$__NUM_NEG__Lsculpter_TokenType();
          var $x_3 = ((x$15 === null) ? (x$16 === null) : (x$15 === x$16));
        }
        if ($x_3) {
          var $x_2 = true;
        } else {
          var x$17 = $f_sc_LinearSeqOps__apply__I__O(this.bs, this.b6).aY;
          var x$18 = $s_Lsculpter_TokenType$__NIL__Lsculpter_TokenType();
          var $x_2 = ((x$17 === null) ? (x$18 === null) : (x$17 === x$18));
        }
        if ((!$x_2)) {
          throw this.ew($f_sc_LinearSeqOps__apply__I__O(this.bs, this.b6), "Second argument of binary arithmetic must be a number or nil");
        }
        var second = this.dX();
        if (this.cJ($s_Lsculpter_TokenType$__ENTER__Lsculpter_TokenType())) {
          this.bR();
        }
        var $x_1 = new $c_Lsculpter_BinaryStatement(operator.aY, first, second);
        break matchResult1;
      } else {
        if (this.cJ($s_Lsculpter_TokenType$__ENTER__Lsculpter_TokenType())) {
          this.bR();
        }
        var $x_1 = new $c_Lsculpter_UnaryStatement(operator.aY, first);
        break matchResult1;
      }
    }
    matchAlts3: {
      matchAlts4: {
        var x$19 = $s_Lsculpter_TokenType$__PUSH__Lsculpter_TokenType();
        if (((x$19 === null) ? (x1 === null) : (x$19 === x1))) {
          break matchAlts4;
        }
        var x$21 = $s_Lsculpter_TokenType$__MOV__Lsculpter_TokenType();
        if (((x$21 === null) ? (x1 === null) : (x$21 === x1))) {
          break matchAlts4;
        }
        break matchAlts3;
      }
      var $x_1 = this.h1();
      break matchResult1;
    }
    matchAlts1: {
      matchAlts2: {
        var x$23 = $s_Lsculpter_TokenType$__QUESTION__Lsculpter_TokenType();
        if (((x$23 === null) ? (x1 === null) : (x$23 === x1))) {
          break matchAlts2;
        }
        var x$25 = $s_Lsculpter_TokenType$__JMP__Lsculpter_TokenType();
        if (((x$25 === null) ? (x1 === null) : (x$25 === x1))) {
          break matchAlts2;
        }
        var x$27 = $s_Lsculpter_TokenType$__POP__Lsculpter_TokenType();
        if (((x$27 === null) ? (x1 === null) : (x$27 === x1))) {
          break matchAlts2;
        }
        var x$29 = $s_Lsculpter_TokenType$__DUP__Lsculpter_TokenType();
        if (((x$29 === null) ? (x1 === null) : (x$29 === x1))) {
          break matchAlts2;
        }
        var x$31 = $s_Lsculpter_TokenType$__NEG__Lsculpter_TokenType();
        if (((x$31 === null) ? (x1 === null) : (x$31 === x1))) {
          break matchAlts2;
        }
        break matchAlts1;
      }
      var $x_1 = this.im();
      break matchResult1;
    }
    throw this.ew(token, ("Expected statement, got " + token.aY));
  }
  return $x_1;
});
$p.im = (function() {
  var operator = this.bR();
  var operand = this.dX();
  if (this.cJ($s_Lsculpter_TokenType$__ENTER__Lsculpter_TokenType())) {
    this.bR();
  }
  return new $c_Lsculpter_UnaryStatement(operator.aY, operand);
});
$p.h1 = (function() {
  var operator = this.bR();
  var left = this.dX();
  var right = this.dX();
  if (this.cJ($s_Lsculpter_TokenType$__ENTER__Lsculpter_TokenType())) {
    this.bR();
  }
  return new $c_Lsculpter_BinaryStatement(operator.aY, left, right);
});
$p.dX = (function() {
  if (this.eC($s_Lsculpter_TokenType$__NUM_NEG__Lsculpter_TokenType())) {
    var numToken = this.h5($s_Lsculpter_TokenType$__NUMBER__Lsculpter_TokenType(), "Expected number after '-'");
    var value = (-(+numToken.dR));
    return $m_Lsculpter_AST$().gb(new $c_Lsculpter_Token($s_Lsculpter_TokenType$__NUMBER__Lsculpter_TokenType(), ("-" + numToken.dh), value, numToken.es));
  } else if (this.eC($s_Lsculpter_TokenType$__NIL__Lsculpter_TokenType())) {
    return new $c_Lsculpter_NilExpr();
  } else {
    if (this.eC($s_Lsculpter_TokenType$__NUMBER__Lsculpter_TokenType())) {
      var $x_1 = $m_Lsculpter_AST$().gb(this.eE());
    } else {
      if ((!this.eC($s_Lsculpter_TokenType$__STACK__Lsculpter_TokenType()))) {
        throw this.ew($f_sc_LinearSeqOps__apply__I__O(this.bs, this.b6), "Expected expression");
      }
      var $x_1 = new $c_Lsculpter_StackExpr(this.eE().dh);
    }
    return $x_1;
  }
});
$p.eC = (function(tokenType) {
  return (this.cJ(tokenType) && (this.bR(), true));
});
$p.cJ = (function(tokenType) {
  if ((!this.cp())) {
    var x = $f_sc_LinearSeqOps__apply__I__O(this.bs, this.b6).aY;
    return ((x === null) ? (tokenType === null) : (x === tokenType));
  } else {
    return false;
  }
});
$p.bR = (function() {
  if ((!this.cp())) {
    this.b6 = ((1 + this.b6) | 0);
  }
  return this.eE();
});
$p.cp = (function() {
  var x = $f_sc_LinearSeqOps__apply__I__O(this.bs, this.b6).aY;
  var x$2 = $s_Lsculpter_TokenType$__EOF__Lsculpter_TokenType();
  return ((x === null) ? (x$2 === null) : (x === x$2));
});
$p.eE = (function() {
  return $f_sc_LinearSeqOps__apply__I__O(this.bs, ((this.b6 - 1) | 0));
});
$p.h5 = (function(tokenType, message) {
  if (this.cJ(tokenType)) {
    return this.bR();
  }
  throw this.ew($f_sc_LinearSeqOps__apply__I__O(this.bs, this.b6), message);
});
$p.ew = (function(token, message) {
  $m_Lsculpter_Lexer$().hk(token, message);
  return new $c_Lsculpter_ParseError();
});
$p.ii = (function() {
  this.bR();
  while ((!this.cp())) {
    var x = this.eE().aY;
    var x$2 = $s_Lsculpter_TokenType$__ENTER__Lsculpter_TokenType();
    if (((x === null) ? (x$2 === null) : (x === x$2))) {
      return (void 0);
    }
    var t = $f_sc_LinearSeqOps__apply__I__O(this.bs, this.b6).aY;
    matchAlts7: {
      matchAlts8: {
        var x$3 = $s_Lsculpter_TokenType$__ADD__Lsculpter_TokenType();
        if (((x$3 === null) ? (t === null) : (x$3 === t))) {
          break matchAlts8;
        }
        var x$5 = $s_Lsculpter_TokenType$__SUB__Lsculpter_TokenType();
        if (((x$5 === null) ? (t === null) : (x$5 === t))) {
          break matchAlts8;
        }
        var x$7 = $s_Lsculpter_TokenType$__MUL__Lsculpter_TokenType();
        if (((x$7 === null) ? (t === null) : (x$7 === t))) {
          break matchAlts8;
        }
        var x$9 = $s_Lsculpter_TokenType$__DIV__Lsculpter_TokenType();
        if (((x$9 === null) ? (t === null) : (x$9 === t))) {
          break matchAlts8;
        }
        var x$11 = $s_Lsculpter_TokenType$__MOD__Lsculpter_TokenType();
        if (((x$11 === null) ? (t === null) : (x$11 === t))) {
          break matchAlts8;
        }
        var x$13 = $s_Lsculpter_TokenType$__NEG__Lsculpter_TokenType();
        if (((x$13 === null) ? (t === null) : (x$13 === t))) {
          break matchAlts8;
        }
        var x$15 = $s_Lsculpter_TokenType$__DUP__Lsculpter_TokenType();
        if (((x$15 === null) ? (t === null) : (x$15 === t))) {
          break matchAlts8;
        }
        var x$17 = $s_Lsculpter_TokenType$__POP__Lsculpter_TokenType();
        if (((x$17 === null) ? (t === null) : (x$17 === t))) {
          break matchAlts8;
        }
        var x$19 = $s_Lsculpter_TokenType$__MOV__Lsculpter_TokenType();
        if (((x$19 === null) ? (t === null) : (x$19 === t))) {
          break matchAlts8;
        }
        var x$21 = $s_Lsculpter_TokenType$__PUSH__Lsculpter_TokenType();
        if (((x$21 === null) ? (t === null) : (x$21 === t))) {
          break matchAlts8;
        }
        var x$23 = $s_Lsculpter_TokenType$__QUESTION__Lsculpter_TokenType();
        if (((x$23 === null) ? (t === null) : (x$23 === t))) {
          break matchAlts8;
        }
        var x$25 = $s_Lsculpter_TokenType$__JMP__Lsculpter_TokenType();
        if (((x$25 === null) ? (t === null) : (x$25 === t))) {
          break matchAlts8;
        }
        var x$27 = $s_Lsculpter_TokenType$__CMP__Lsculpter_TokenType();
        if (((x$27 === null) ? (t === null) : (x$27 === t))) {
          break matchAlts8;
        }
        break matchAlts7;
      }
      return (void 0);
    }
    this.bR();
  }
});
var $d_Lsculpter_Parser$ = new $TypeData().i($c_Lsculpter_Parser$, "sculpter.Parser$", ({
  e4: 1
}));
var $n_Lsculpter_Parser$;
function $m_Lsculpter_Parser$() {
  if ((!$n_Lsculpter_Parser$)) {
    $n_Lsculpter_Parser$ = new $c_Lsculpter_Parser$();
  }
  return $n_Lsculpter_Parser$;
}
/** @constructor */
function $c_Lsculpter_Token(pTokenType, pLexeme, pLiteral, pLine) {
  this.aY = null;
  this.dh = null;
  this.dR = null;
  this.es = 0;
  this.aY = pTokenType;
  this.dh = pLexeme;
  this.dR = pLiteral;
  this.es = pLine;
}
$p = $c_Lsculpter_Token.prototype = new $h_O();
$p.constructor = $c_Lsculpter_Token;
/** @constructor */
function $h_Lsculpter_Token() {
}
$h_Lsculpter_Token.prototype = $p;
$p.A = (function() {
  return ((((this.aY + " ") + this.dh) + " ") + this.dR);
});
var $d_Lsculpter_Token = new $TypeData().i($c_Lsculpter_Token, "sculpter.Token", ({
  e5: 1
}));
/** @constructor */
function $c_Lsculpter_Tokens$package$() {
  this.fY = null;
  $n_Lsculpter_Tokens$package$ = this;
  this.fY = $m_sci_Map$().gh(new $c_sjsr_WrappedVarArgs([new $c_T2("nil", $s_Lsculpter_TokenType$__NIL__Lsculpter_TokenType()), new $c_T2("jmp", $s_Lsculpter_TokenType$__JMP__Lsculpter_TokenType()), new $c_T2("cmp", $s_Lsculpter_TokenType$__CMP__Lsculpter_TokenType()), new $c_T2("push", $s_Lsculpter_TokenType$__PUSH__Lsculpter_TokenType()), new $c_T2("pop", $s_Lsculpter_TokenType$__POP__Lsculpter_TokenType()), new $c_T2("dup", $s_Lsculpter_TokenType$__DUP__Lsculpter_TokenType()), new $c_T2("mov", $s_Lsculpter_TokenType$__MOV__Lsculpter_TokenType()), new $c_T2("add", $s_Lsculpter_TokenType$__ADD__Lsculpter_TokenType()), new $c_T2("sub", $s_Lsculpter_TokenType$__SUB__Lsculpter_TokenType()), new $c_T2("mul", $s_Lsculpter_TokenType$__MUL__Lsculpter_TokenType()), new $c_T2("div", $s_Lsculpter_TokenType$__DIV__Lsculpter_TokenType()), new $c_T2("mod", $s_Lsculpter_TokenType$__MOD__Lsculpter_TokenType()), new $c_T2("neg", $s_Lsculpter_TokenType$__NEG__Lsculpter_TokenType()), new $c_T2("NIL", $s_Lsculpter_TokenType$__NIL__Lsculpter_TokenType()), new $c_T2("JMP", $s_Lsculpter_TokenType$__JMP__Lsculpter_TokenType()), new $c_T2("CMP", $s_Lsculpter_TokenType$__CMP__Lsculpter_TokenType()), new $c_T2("PUSH", $s_Lsculpter_TokenType$__PUSH__Lsculpter_TokenType()), new $c_T2("POP", $s_Lsculpter_TokenType$__POP__Lsculpter_TokenType()), new $c_T2("DUP", $s_Lsculpter_TokenType$__DUP__Lsculpter_TokenType()), new $c_T2("MOV", $s_Lsculpter_TokenType$__MOV__Lsculpter_TokenType()), new $c_T2("ADD", $s_Lsculpter_TokenType$__ADD__Lsculpter_TokenType()), new $c_T2("SUB", $s_Lsculpter_TokenType$__SUB__Lsculpter_TokenType()), new $c_T2("MUL", $s_Lsculpter_TokenType$__MUL__Lsculpter_TokenType()), new $c_T2("DIV", $s_Lsculpter_TokenType$__DIV__Lsculpter_TokenType()), new $c_T2("MOD", $s_Lsculpter_TokenType$__MOD__Lsculpter_TokenType()), new $c_T2("NEG", $s_Lsculpter_TokenType$__NEG__Lsculpter_TokenType())]));
}
$p = $c_Lsculpter_Tokens$package$.prototype = new $h_O();
$p.constructor = $c_Lsculpter_Tokens$package$;
/** @constructor */
function $h_Lsculpter_Tokens$package$() {
}
$h_Lsculpter_Tokens$package$.prototype = $p;
var $d_Lsculpter_Tokens$package$ = new $TypeData().i($c_Lsculpter_Tokens$package$, "sculpter.Tokens$package$", ({
  e9: 1
}));
var $n_Lsculpter_Tokens$package$;
function $m_Lsculpter_Tokens$package$() {
  if ((!$n_Lsculpter_Tokens$package$)) {
    $n_Lsculpter_Tokens$package$ = new $c_Lsculpter_Tokens$package$();
  }
  return $n_Lsculpter_Tokens$package$;
}
/** @constructor */
function $c_Lvision_PuenteJS$() {
}
$p = $c_Lvision_PuenteJS$.prototype = new $h_O();
$p.constructor = $c_Lvision_PuenteJS$;
/** @constructor */
function $h_Lvision_PuenteJS$() {
}
$h_Lvision_PuenteJS$.prototype = $p;
$p.hf = (function(codigoFuente) {
  $m_Lsculpter_Lexer$().gX(codigoFuente);
  if ($m_Lsculpter_Lexer$().dQ) {
    return ({
      "valido": false,
      "etapa": "lexer"
    });
  }
  var programa = $m_Lsculpter_Parser$().gY($m_Lsculpter_Lexer$().cn);
  if ($m_Lsculpter_Lexer$().dQ) {
    return ({
      "valido": false,
      "etapa": "parser"
    });
  }
  $m_Lsculpter_InterpreterInstance$().i6(programa);
  var pasos = [];
  var continuar = true;
  try {
    while (continuar) {
      continuar = $m_Lsculpter_InterpreterInstance$().ih();
      if (continuar) {
        var pilas = $m_Lsculpter_InterpreterInstance$().i;
        var pilasJs = $m_sjs_js_special_package$().hU($m_sci_Seq$().fb(pilas).cb(new $c_sr_AbstractFunction1_$$Lambda$7afc3dd0acc1681fb022ef921c83979087aaa919(((x$1$2) => {
          if ((x$1$2 !== null)) {
            var nombre = x$1$2.az;
            var valores = x$1$2.aA;
            var $x_2 = $m_sjsr_Compat$();
            var f = ((_$1$2) => (+(_$1$2.l() ? (NaN) : _$1$2.e0())));
            if ((valores === $m_sci_Nil$())) {
              var $x_1 = $m_sci_Nil$();
            } else {
              var x0 = valores.w();
              var h = new $c_sci_$colon$colon(f(x0), $m_sci_Nil$());
              var t = h;
              var rest = valores.F();
              while ((rest !== $m_sci_Nil$())) {
                var x0$1 = rest.w();
                var nx = new $c_sci_$colon$colon(f(x0$1), $m_sci_Nil$());
                t.bZ = nx;
                t = nx;
                rest = rest.F();
              }
              var $x_1 = h;
            }
            return new $c_T2(nombre, [...$x_2.il($x_1)]);
          }
          throw new $c_s_MatchError(x$1$2);
        }))));
        pasos.push(pilasJs);
      }
    }
    return ({
      "valido": true,
      "etapa": "ok",
      "pasos": pasos
    });
  } catch (e) {
    var e$2 = ((e instanceof $c_jl_Throwable) ? e : new $c_sjs_js_JavaScriptException(e));
    if ((e$2 instanceof $c_jl_RuntimeException)) {
      var s = e$2.e2();
      return ({
        "valido": false,
        "etapa": "runtime",
        "mensaje": s,
        "pasos": pasos
      });
    } else {
      throw e;
    }
  }
});
var $d_Lvision_PuenteJS$ = new $TypeData().i($c_Lvision_PuenteJS$, "vision.PuenteJS$", ({
  ea: 1
}));
var $n_Lvision_PuenteJS$;
function $m_Lvision_PuenteJS$() {
  if ((!$n_Lvision_PuenteJS$)) {
    $n_Lvision_PuenteJS$ = new $c_Lvision_PuenteJS$();
  }
  return $n_Lvision_PuenteJS$;
}
/** @constructor */
function $c_jl_Character$() {
  this.eH = null;
  $n_jl_Character$ = this;
  this.eH = $constArrUDiffs_I(67, "1C]4m6m=c4]4]4]4]4]4]4]4]4]3g4]2m9]2m1Jm1m9s4g5mm6]3]4mm12>mEm1m6m1]3]=]DI]1<m24mIs4g2c4w9];]4]<]3m3m=m3mH]8]2m=mBHm3]4mK3{gggg2:g=m@]13]4E]");
}
$p = $c_jl_Character$.prototype = new $h_O();
$p.constructor = $c_jl_Character$;
/** @constructor */
function $h_jl_Character$() {
}
$h_jl_Character$.prototype = $p;
$p.hb = (function(codePoint, radix) {
  if ((codePoint < 256)) {
    var value = (((((codePoint - 48) | 0) >>> 0) <= 9) ? ((codePoint - 48) | 0) : (((((codePoint - 65) | 0) >>> 0) <= 25) ? ((codePoint - 55) | 0) : (((((codePoint - 97) | 0) >>> 0) <= 25) ? ((codePoint - 87) | 0) : (-1))));
  } else if (((((codePoint - 65313) | 0) >>> 0) <= 25)) {
    var value = ((codePoint - 65303) | 0);
  } else if (((((codePoint - 65345) | 0) >>> 0) <= 25)) {
    var value = ((codePoint - 65335) | 0);
  } else {
    var p = $m_ju_Arrays$().h2(this.eH, codePoint);
    var zeroCodePointIndex = ((p < 0) ? (((-2) - p) | 0) : p);
    if ((zeroCodePointIndex < 0)) {
      var value = (-1);
    } else {
      var v = ((codePoint - this.eH.a[zeroCodePointIndex]) | 0);
      var value = ((v > 9) ? (-1) : v);
    }
  }
  return ((value < radix) ? value : (-1));
});
var $d_jl_Character$ = new $TypeData().i($c_jl_Character$, "java.lang.Character$", ({
  bi: 1,
  a: 1
}));
var $n_jl_Character$;
function $m_jl_Character$() {
  if ((!$n_jl_Character$)) {
    $n_jl_Character$ = new $c_jl_Character$();
  }
  return $n_jl_Character$;
}
function $p_jl_Double$__doubleStrPat$lzycompute__O($thiz) {
  if (((((1 & $thiz.cs) << 24) >> 24) === 0)) {
    $thiz.eJ = new RegExp("^[\\x00-\\x20]*([+-]?(?:NaN|Infinity|(?:\\d+\\.?\\d*|\\.\\d+)(?:[eE][+-]?\\d+)?)[fFdD]?)[\\x00-\\x20]*$");
    $thiz.cs = (((1 | $thiz.cs) << 24) >> 24);
  }
  return $thiz.eJ;
}
function $p_jl_Double$__doubleStrPat__O($thiz) {
  return (((((1 & $thiz.cs) << 24) >> 24) === 0) ? $p_jl_Double$__doubleStrPat$lzycompute__O($thiz) : $thiz.eJ);
}
function $p_jl_Double$__doubleStrHexPat$lzycompute__O($thiz) {
  if (((((2 & $thiz.cs) << 24) >> 24) === 0)) {
    $thiz.eI = new RegExp("^[\\x00-\\x20]*([+-]?)0[xX]([0-9A-Fa-f]*)\\.?([0-9A-Fa-f]*)[pP]([+-]?\\d+)[fFdD]?[\\x00-\\x20]*$");
    $thiz.cs = (((2 | $thiz.cs) << 24) >> 24);
  }
  return $thiz.eI;
}
function $p_jl_Double$__doubleStrHexPat__O($thiz) {
  return (((((2 & $thiz.cs) << 24) >> 24) === 0) ? $p_jl_Double$__doubleStrHexPat$lzycompute__O($thiz) : $thiz.eI);
}
function $p_jl_Double$__parseDoubleSlowPath__T__D($thiz, s) {
  var groups = $p_jl_Double$__doubleStrHexPat__O($thiz).exec(s);
  if ((groups === null)) {
    $ps_jl_Double$__fail$1__T__E(s);
  }
  var x = groups[1];
  var x$1 = groups[2];
  var x$2 = groups[3];
  var x$3 = groups[4];
  if (((x$1 === "") && (x$2 === ""))) {
    $ps_jl_Double$__fail$1__T__E(s);
  }
  var absResult = $thiz.hX(x$1, x$2, x$3, 15);
  return ((x === "-") ? (-absResult) : absResult);
}
function $ps_jl_Double$__fail$1__T__E(s$1) {
  throw new $c_jl_NumberFormatException((("For input string: \"" + s$1) + "\""));
}
/** @constructor */
function $c_jl_Double$() {
  this.eJ = null;
  this.eI = null;
  this.cs = 0;
}
$p = $c_jl_Double$.prototype = new $h_O();
$p.constructor = $c_jl_Double$;
/** @constructor */
function $h_jl_Double$() {
}
$h_jl_Double$.prototype = $p;
$p.gq = (function(s) {
  var groups = $p_jl_Double$__doubleStrPat__O(this).exec(s);
  return ((groups !== null) ? (+parseFloat(groups[1])) : $p_jl_Double$__parseDoubleSlowPath__T__D(this, s));
});
$p.hX = (function(integralPartStr, fractionalPartStr, binaryExpStr, maxPrecisionChars) {
  var mantissaStr0 = (("" + integralPartStr) + fractionalPartStr);
  var correction1 = ((-(fractionalPartStr.length << 2)) | 0);
  var limit = ((mantissaStr0.length - 1) | 0);
  var i = 0;
  while (((i !== limit) && (mantissaStr0.charCodeAt(i) === 48))) {
    i = ((1 + i) | 0);
  }
  var beginIndex = i;
  var mantissaStr = mantissaStr0.substring(beginIndex);
  var mantissaStrLen = mantissaStr.length;
  var needsCorrection2 = (mantissaStrLen > maxPrecisionChars);
  if (needsCorrection2) {
    var hasNonZeroChar = false;
    var j = maxPrecisionChars;
    while (((!hasNonZeroChar) && (j !== mantissaStrLen))) {
      if ((mantissaStr.charCodeAt(j) !== 48)) {
        hasNonZeroChar = true;
      }
      j = ((1 + j) | 0);
    }
    var compressedTail = (hasNonZeroChar ? "1" : "0");
    var truncatedMantissaStr = (mantissaStr.substring(0, maxPrecisionChars) + compressedTail);
  } else {
    var truncatedMantissaStr = mantissaStr;
  }
  var correction2 = (needsCorrection2 ? (((mantissaStr.length - ((1 + maxPrecisionChars) | 0)) | 0) << 2) : 0);
  var fullCorrection = ((correction1 + correction2) | 0);
  return $m_jl_Math$().ib((+parseInt(truncatedMantissaStr, 16)), (($doubleToInt((+parseInt(binaryExpStr, 10))) + fullCorrection) | 0));
});
var $d_jl_Double$ = new $TypeData().i($c_jl_Double$, "java.lang.Double$", ({
  bl: 1,
  a: 1
}));
var $n_jl_Double$;
function $m_jl_Double$() {
  if ((!$n_jl_Double$)) {
    $n_jl_Double$ = new $c_jl_Double$();
  }
  return $n_jl_Double$;
}
/** @constructor */
function $c_jl_Integer$() {
}
$p = $c_jl_Integer$.prototype = new $h_O();
$p.constructor = $c_jl_Integer$;
/** @constructor */
function $h_jl_Integer$() {
}
$h_jl_Integer$.prototype = $p;
$p.e5 = (function(s) {
  throw new $c_jl_NumberFormatException((("For input string: \"" + s) + "\""));
});
$p.gp = (function(s, radix, overflowBarrier) {
  if ((s === null)) {
    $m_jl_Integer$().e5(s);
  }
  var len = s.length;
  if ((len === 0)) {
    $m_jl_Integer$().e5(s);
  }
  var character = $m_jl_Character$();
  var firstChar = s.charCodeAt(0);
  var negative = (firstChar === 45);
  var sign = (negative ? (-1) : 0);
  var i = ((negative || (firstChar === 43)) | 0);
  if ((i >= len)) {
    $m_jl_Integer$().e5(s);
  }
  var java$lang$IntFloatBits$Int32Box$$value = 0;
  java$lang$IntFloatBits$Int32Box$$value = 0;
  while ((i !== len)) {
    var x = character.hb(s.charCodeAt(i), radix);
    if (((x < 0) || ((java$lang$IntFloatBits$Int32Box$$value >>> 0) > (overflowBarrier >>> 0)))) {
      $m_jl_Integer$().e5(s);
    }
    var x$2 = java$lang$IntFloatBits$Int32Box$$value;
    var x$3 = Math.imul(x$2, radix);
    var v = ((x$3 + x) | 0);
    java$lang$IntFloatBits$Int32Box$$value = v;
    i = ((1 + i) | 0);
  }
  if (((java$lang$IntFloatBits$Int32Box$$value >>> 0) > (((2147483647 - sign) | 0) >>> 0))) {
    $m_jl_Integer$().e5(s);
  }
  return (((java$lang$IntFloatBits$Int32Box$$value ^ sign) - sign) | 0);
});
$p.bS = (function(i) {
  var t1 = ((i - (1431655765 & (i >> 1))) | 0);
  var t2 = (((858993459 & t1) + (858993459 & (t1 >> 2))) | 0);
  return (Math.imul(16843009, (252645135 & ((t2 + (t2 >> 4)) | 0))) >> 24);
});
var $d_jl_Integer$ = new $TypeData().i($c_jl_Integer$, "java.lang.Integer$", ({
  bp: 1,
  a: 1
}));
var $n_jl_Integer$;
function $m_jl_Integer$() {
  if ((!$n_jl_Integer$)) {
    $n_jl_Integer$ = new $c_jl_Integer$();
  }
  return $n_jl_Integer$;
}
/** @constructor */
function $c_jl_Number() {
}
$p = $c_jl_Number.prototype = new $h_O();
$p.constructor = $c_jl_Number;
/** @constructor */
function $h_jl_Number() {
}
$h_jl_Number.prototype = $p;
function $is_jl_Number(obj) {
  return (((obj instanceof $c_jl_Number) || ((typeof obj) === "number")) || (obj instanceof $Long));
}
function $isArrayOf_jl_Number(obj, depth) {
  return (!(!(((obj && obj.$classData) && (obj.$classData.D === depth)) && obj.$classData.B.n.S)));
}
/** @constructor */
function $c_jl_String$() {
}
$p = $c_jl_String$.prototype = new $h_O();
$p.constructor = $c_jl_String$;
/** @constructor */
function $h_jl_String$() {
}
$h_jl_String$.prototype = $p;
$p.hP = (function(value, offset, count) {
  var endOffset = ((offset + count) | 0);
  var result = "";
  var i = offset;
  while ((i !== endOffset)) {
    result = (result + ("" + $cToS(value.a[i])));
    i = ((1 + i) | 0);
  }
  return result;
});
var $d_jl_String$ = new $TypeData().i($c_jl_String$, "java.lang.String$", ({
  by: 1,
  a: 1
}));
var $n_jl_String$;
function $m_jl_String$() {
  if ((!$n_jl_String$)) {
    $n_jl_String$ = new $c_jl_String$();
  }
  return $n_jl_String$;
}
function $ct_jl_Throwable__T__jl_Throwable__Z__Z__($thiz, s, e, enableSuppression, writableStackTrace) {
  $thiz.fr = s;
  if (writableStackTrace) {
    $thiz.hl();
  }
  return $thiz;
}
class $c_jl_Throwable extends Error {
  constructor() {
    super();
    this.fr = null;
  }
  e2() {
    return this.fr;
  }
  hl() {
    var reference = ((this instanceof $c_sjs_js_JavaScriptException) ? this.df : this);
    if ((Object.prototype.toString.call(reference) !== "[object Error]")) {
      if (((Error.captureStackTrace === (void 0)) || (!(!Object.isSealed(this))))) {
        new Error();
      } else {
        Error.captureStackTrace(this);
      }
    }
    return this;
  }
  A() {
    var className = $objectClassName(this);
    var message = this.e2();
    return ((message === null) ? className : ((className + ": ") + message));
  }
  S() {
    return $c_O.prototype.S.call(this);
  }
  P(that) {
    return $c_O.prototype.P.call(this, that);
  }
  get "message"() {
    var m = this.e2();
    return ((m === null) ? "" : m);
  }
  get "name"() {
    return $objectClassName(this);
  }
  "toString"() {
    return this.A();
  }
}
function $isArrayOf_jl_Throwable(obj, depth) {
  return (!(!(((obj && obj.$classData) && (obj.$classData.D === depth)) && obj.$classData.B.n.r)));
}
/** @constructor */
function $c_s_Console$() {
  this.fu = null;
  $n_s_Console$ = this;
  this.fu = new $c_s_util_DynamicVariable($m_jl_System$Streams$().fp);
}
$p = $c_s_Console$.prototype = new $h_O();
$p.constructor = $c_s_Console$;
/** @constructor */
function $h_s_Console$() {
}
$h_s_Console$.prototype = $p;
$p.hW = (function() {
  return this.fu.f1;
});
var $d_s_Console$ = new $TypeData().i($c_s_Console$, "scala.Console$", ({
  bQ: 1,
  dt: 1
}));
var $n_s_Console$;
function $m_s_Console$() {
  if ((!$n_s_Console$)) {
    $n_s_Console$ = new $c_s_Console$();
  }
  return $n_s_Console$;
}
/** @constructor */
function $c_s_LowPriorityImplicits() {
}
$p = $c_s_LowPriorityImplicits.prototype = new $h_s_LowPriorityImplicits2();
$p.constructor = $c_s_LowPriorityImplicits;
/** @constructor */
function $h_s_LowPriorityImplicits() {
}
$h_s_LowPriorityImplicits.prototype = $p;
/** @constructor */
function $c_sci_LazyList$Uninitialized$() {
}
$p = $c_sci_LazyList$Uninitialized$.prototype = new $h_O();
$p.constructor = $c_sci_LazyList$Uninitialized$;
/** @constructor */
function $h_sci_LazyList$Uninitialized$() {
}
$h_sci_LazyList$Uninitialized$.prototype = $p;
var $d_sci_LazyList$Uninitialized$ = new $TypeData().i($c_sci_LazyList$Uninitialized$, "scala.collection.immutable.LazyList$Uninitialized$", ({
  cw: 1,
  a: 1
}));
var $n_sci_LazyList$Uninitialized$;
function $m_sci_LazyList$Uninitialized$() {
  if ((!$n_sci_LazyList$Uninitialized$)) {
    $n_sci_LazyList$Uninitialized$ = new $c_sci_LazyList$Uninitialized$();
  }
  return $n_sci_LazyList$Uninitialized$;
}
/** @constructor */
function $c_sci_MapNode() {
}
$p = $c_sci_MapNode.prototype = new $h_sci_Node();
$p.constructor = $c_sci_MapNode;
/** @constructor */
function $h_sci_MapNode() {
}
$h_sci_MapNode.prototype = $p;
function $f_scm_Growable__addAll__sc_IterableOnce__scm_Growable($thiz, elems) {
  if ((elems === $thiz)) {
    $thiz.b7($m_scm_Buffer$().ez(elems));
  } else {
    var it = elems.k();
    while (it.m()) {
      $thiz.b8(it.g());
    }
  }
  return $thiz;
}
/** @constructor */
function $c_sr_AbstractFunction0() {
}
$p = $c_sr_AbstractFunction0.prototype = new $h_O();
$p.constructor = $c_sr_AbstractFunction0;
/** @constructor */
function $h_sr_AbstractFunction0() {
}
$h_sr_AbstractFunction0.prototype = $p;
$p.A = (function() {
  return "<function0>";
});
/** @constructor */
function $c_sr_AbstractFunction1() {
}
$p = $c_sr_AbstractFunction1.prototype = new $h_O();
$p.constructor = $c_sr_AbstractFunction1;
/** @constructor */
function $h_sr_AbstractFunction1() {
}
$h_sr_AbstractFunction1.prototype = $p;
$p.A = (function() {
  return "<function1>";
});
/** @constructor */
function $c_sr_AbstractFunction2() {
}
$p = $c_sr_AbstractFunction2.prototype = new $h_O();
$p.constructor = $c_sr_AbstractFunction2;
/** @constructor */
function $h_sr_AbstractFunction2() {
}
$h_sr_AbstractFunction2.prototype = $p;
$p.A = (function() {
  return "<function2>";
});
/** @constructor */
function $c_sr_IntRef(elem) {
  this.ek = 0;
  this.ek = elem;
}
$p = $c_sr_IntRef.prototype = new $h_O();
$p.constructor = $c_sr_IntRef;
/** @constructor */
function $h_sr_IntRef() {
}
$h_sr_IntRef.prototype = $p;
$p.A = (function() {
  return ("" + this.ek);
});
var $d_sr_IntRef = new $TypeData().i($c_sr_IntRef, "scala.runtime.IntRef", ({
  dL: 1,
  a: 1
}));
/** @constructor */
function $c_sr_ObjectRef(elem) {
  this.el = null;
  this.el = elem;
}
$p = $c_sr_ObjectRef.prototype = new $h_O();
$p.constructor = $c_sr_ObjectRef;
/** @constructor */
function $h_sr_ObjectRef() {
}
$h_sr_ObjectRef.prototype = $p;
$p.A = (function() {
  return ("" + this.el);
});
var $d_sr_ObjectRef = new $TypeData().i($c_sr_ObjectRef, "scala.runtime.ObjectRef", ({
  dM: 1,
  a: 1
}));
/** @constructor */
function $c_s_util_hashing_MurmurHash3$() {
  this.en = 0;
  this.cG = 0;
  this.gG = 0;
  this.f2 = 0;
  $n_s_util_hashing_MurmurHash3$ = this;
  this.en = $f_T__hashCode__I("Seq");
  this.cG = $f_T__hashCode__I("Map");
  this.gG = $f_T__hashCode__I("Set");
  this.f2 = this.gB($m_sci_Nil$(), this.cG);
}
$p = $c_s_util_hashing_MurmurHash3$.prototype = new $h_s_util_hashing_MurmurHash3();
$p.constructor = $c_s_util_hashing_MurmurHash3$;
/** @constructor */
function $h_s_util_hashing_MurmurHash3$() {
}
$h_s_util_hashing_MurmurHash3$.prototype = $p;
$p.bW = (function(x, y) {
  return this.gA($m_sr_Statics$().aj(x), $m_sr_Statics$().aj(y), (-889275714));
});
$p.gx = (function(xs) {
  return ($is_sc_IndexedSeq(xs) ? this.hy(xs, this.en) : ((xs instanceof $c_sci_List) ? this.hF(xs, this.en) : this.hV(xs, this.en)));
});
$p.hL = (function(xs) {
  if (xs.l()) {
    return this.f2;
  } else {
    var accum = new $c_s_util_hashing_MurmurHash3$accum$1();
    var h = this.cG;
    xs.d0(accum);
    h = this.y(h, accum.eo);
    h = this.y(h, accum.ep);
    h = this.cq(h, accum.eq);
    return this.aU(h, accum.er);
  }
});
var $d_s_util_hashing_MurmurHash3$ = new $TypeData().i($c_s_util_hashing_MurmurHash3$, "scala.util.hashing.MurmurHash3$", ({
  dY: 1,
  dX: 1
}));
var $n_s_util_hashing_MurmurHash3$;
function $m_s_util_hashing_MurmurHash3$() {
  if ((!$n_s_util_hashing_MurmurHash3$)) {
    $n_s_util_hashing_MurmurHash3$ = new $c_s_util_hashing_MurmurHash3$();
  }
  return $n_s_util_hashing_MurmurHash3$;
}
/** @constructor */
function $c_s_util_hashing_MurmurHash3$accum$1() {
  this.eo = 0;
  this.ep = 0;
  this.er = 0;
  this.eq = 0;
  this.eo = 0;
  this.ep = 0;
  this.er = 0;
  this.eq = 1;
}
$p = $c_s_util_hashing_MurmurHash3$accum$1.prototype = new $h_O();
$p.constructor = $c_s_util_hashing_MurmurHash3$accum$1;
/** @constructor */
function $h_s_util_hashing_MurmurHash3$accum$1() {
}
$h_s_util_hashing_MurmurHash3$accum$1.prototype = $p;
$p.A = (function() {
  return "<function2>";
});
$p.gV = (function(k, v) {
  var h = $m_s_util_hashing_MurmurHash3$().bW(k, v);
  this.eo = ((this.eo + h) | 0);
  this.ep = (this.ep ^ h);
  this.eq = Math.imul(this.eq, (1 | h));
  this.er = ((1 + this.er) | 0);
});
$p.eu = (function(v1, v2) {
  this.gV(v1, v2);
});
var $d_s_util_hashing_MurmurHash3$accum$1 = new $TypeData().i($c_s_util_hashing_MurmurHash3$accum$1, "scala.util.hashing.MurmurHash3$accum$1", ({
  dZ: 1,
  aD: 1
}));
/** @constructor */
function $c_Lsculpter_InterpreterInstance$() {
  this.i = null;
  this.dO = null;
  this.aS = 0;
  this.dP = null;
  $ct_Lsculpter_Interpreter__(this);
}
$p = $c_Lsculpter_InterpreterInstance$.prototype = new $h_Lsculpter_Interpreter();
$p.constructor = $c_Lsculpter_InterpreterInstance$;
/** @constructor */
function $h_Lsculpter_InterpreterInstance$() {
}
$h_Lsculpter_InterpreterInstance$.prototype = $p;
var $d_Lsculpter_InterpreterInstance$ = new $TypeData().i($c_Lsculpter_InterpreterInstance$, "sculpter.InterpreterInstance$", ({
  e2: 1,
  e1: 1
}));
var $n_Lsculpter_InterpreterInstance$;
function $m_Lsculpter_InterpreterInstance$() {
  if ((!$n_Lsculpter_InterpreterInstance$)) {
    $n_Lsculpter_InterpreterInstance$ = new $c_Lsculpter_InterpreterInstance$();
  }
  return $n_Lsculpter_InterpreterInstance$;
}
/** @constructor */
function $c_jl_Class($data) {
  this.be = $data;
}
$p = $c_jl_Class.prototype = new $h_O();
$p.constructor = $c_jl_Class;
/** @constructor */
function $h_jl_Class() {
}
$h_jl_Class.prototype = $p;
$p.A = (function() {
  return ((this.be.Y ? "interface " : (this.be.X ? "" : "class ")) + this.be.N);
});
var $d_jl_Class = new $TypeData().i($c_jl_Class, "java.lang.Class", ({
  bj: 1,
  a: 1,
  F: 1
}));
class $c_jl_Exception extends $c_jl_Throwable {
}
/** @constructor */
function $c_s_$less$colon$less() {
}
$p = $c_s_$less$colon$less.prototype = new $h_O();
$p.constructor = $c_s_$less$colon$less;
/** @constructor */
function $h_s_$less$colon$less() {
}
$h_s_$less$colon$less.prototype = $p;
/** @constructor */
function $c_s_Predef$() {
  this.gF = null;
  $n_s_Predef$ = this;
  $m_sci_List$();
  this.gF = $m_sci_Map$();
}
$p = $c_s_Predef$.prototype = new $h_s_LowPriorityImplicits();
$p.constructor = $c_s_Predef$;
/** @constructor */
function $h_s_Predef$() {
}
$h_s_Predef$.prototype = $p;
$p.i5 = (function(requirement) {
  if ((!requirement)) {
    throw $ct_jl_IllegalArgumentException__T__(new $c_jl_IllegalArgumentException(), "requirement failed");
  }
});
var $d_s_Predef$ = new $TypeData().i($c_s_Predef$, "scala.Predef$", ({
  bW: 1,
  bS: 1,
  bT: 1
}));
var $n_s_Predef$;
function $m_s_Predef$() {
  if ((!$n_s_Predef$)) {
    $n_s_Predef$ = new $c_s_Predef$();
  }
  return $n_s_Predef$;
}
function $f_s_Product2__productElement__I__O($thiz, n) {
  switch (n) {
    case 0: {
      return $thiz.az;
      break;
    }
    case 1: {
      return $thiz.aA;
      break;
    }
    default: {
      throw $ct_jl_IndexOutOfBoundsException__T__(new $c_jl_IndexOutOfBoundsException(), (n + " is out of bounds (min 0, max 1)"));
    }
  }
}
function $ct_sc_IterableFactory$Delegate__sc_IterableFactory__($thiz, delegate) {
  $thiz.ea = delegate;
  return $thiz;
}
/** @constructor */
function $c_sc_IterableFactory$Delegate() {
  this.ea = null;
}
$p = $c_sc_IterableFactory$Delegate.prototype = new $h_O();
$p.constructor = $c_sc_IterableFactory$Delegate;
/** @constructor */
function $h_sc_IterableFactory$Delegate() {
}
$h_sc_IterableFactory$Delegate.prototype = $p;
$p.aq = (function(it) {
  return this.ea.aq(it);
});
$p.ba = (function() {
  return this.ea.ba();
});
function $f_sc_IterableOps__sizeCompare__I__I($thiz, otherSize) {
  if ((otherSize < 0)) {
    return 1;
  } else {
    var known = $thiz.r();
    if ((known >= 0)) {
      return ((known === otherSize) ? 0 : ((known < otherSize) ? (-1) : 1));
    } else {
      var i = 0;
      var it = $thiz.k();
      while (it.m()) {
        if ((i === otherSize)) {
          return 1;
        }
        it.g();
        i = ((1 + i) | 0);
      }
      return ((i - otherSize) | 0);
    }
  }
}
function $f_sc_IterableOps__drop__I__O($thiz, n) {
  return $thiz.dm($ct_sc_View$Drop__sc_IterableOps__I__(new $c_sc_View$Drop(), $thiz, n));
}
function $f_sc_IterableOps__tail__O($thiz) {
  if ($thiz.l()) {
    throw $ct_jl_UnsupportedOperationException__(new $c_jl_UnsupportedOperationException());
  }
  return $thiz.aZ(1);
}
function $f_sc_Iterator__concat__F0__sc_Iterator($thiz, xs) {
  return new $c_sc_Iterator$ConcatIterator($thiz).f7(xs);
}
function $f_sc_Iterator__sliceIterator__I__I__sc_Iterator($thiz, from, until) {
  var lo = ((from > 0) ? from : 0);
  var rest = ((until < 0) ? (-1) : ((until <= lo) ? 0 : ((until - lo) | 0)));
  return ((rest === 0) ? $m_sc_Iterator$().ab : new $c_sc_Iterator$SliceIterator($thiz, lo, rest));
}
function $f_sc_Iterator__sameElements__sc_IterableOnce__Z($thiz, that) {
  var those = that.k();
  while ($thiz.m()) {
    if ((!those.m())) {
      return false;
    }
    if ((!$m_sr_BoxesRunTime$().h($thiz.g(), those.g()))) {
      return false;
    }
  }
  return (!those.m());
}
/** @constructor */
function $c_sc_Iterator$() {
  this.ab = null;
  $n_sc_Iterator$ = this;
  this.ab = new $c_sc_Iterator$$anon$19();
}
$p = $c_sc_Iterator$.prototype = new $h_O();
$p.constructor = $c_sc_Iterator$;
/** @constructor */
function $h_sc_Iterator$() {
}
$h_sc_Iterator$.prototype = $p;
$p.ba = (function() {
  return new $c_sc_Iterator$$anon$21();
});
$p.aq = (function(source) {
  return source.k();
});
var $d_sc_Iterator$ = new $TypeData().i($c_sc_Iterator$, "scala.collection.Iterator$", ({
  c3: 1,
  a: 1,
  x: 1
}));
var $n_sc_Iterator$;
function $m_sc_Iterator$() {
  if ((!$n_sc_Iterator$)) {
    $n_sc_Iterator$ = new $c_sc_Iterator$();
  }
  return $n_sc_Iterator$;
}
function $ct_sc_MapFactory$Delegate__sc_MapFactory__($thiz, delegate) {
  $thiz.eN = delegate;
  return $thiz;
}
/** @constructor */
function $c_sc_MapFactory$Delegate() {
  this.eN = null;
}
$p = $c_sc_MapFactory$Delegate.prototype = new $h_O();
$p.constructor = $c_sc_MapFactory$Delegate;
/** @constructor */
function $h_sc_MapFactory$Delegate() {
}
$h_sc_MapFactory$Delegate.prototype = $p;
$p.aq = (function(it) {
  return this.eN.aq(it);
});
/** @constructor */
function $c_sc_View$() {
}
$p = $c_sc_View$.prototype = new $h_O();
$p.constructor = $c_sc_View$;
/** @constructor */
function $h_sc_View$() {
}
$h_sc_View$.prototype = $p;
$p.gf = (function(it) {
  return ($is_sc_View(it) ? it : ($is_sc_Iterable(it) ? new $c_sc_View$$anon$1(new $c_sr_AbstractFunction0_$$Lambda$07eded5776954a9c145e92c329afd52873ad179c(((it$2) => (() => it$2.k()))(it))) : $ct_sc_SeqView$Id__sc_SeqOps__(new $c_sc_SeqView$Id(), $m_sci_LazyList$().gg(it))));
});
$p.ba = (function() {
  return new $c_scm_Builder$$anon$1(new $c_sr_AbstractFunction1_$$Lambda$7afc3dd0acc1681fb022ef921c83979087aaa919(((it$2) => this.gf(it$2))), ($m_scm_ArrayBuffer$(), new $c_scm_ArrayBuffer$$anon$1()));
});
$p.aq = (function(source) {
  return this.gf(source);
});
var $d_sc_View$ = new $TypeData().i($c_sc_View$, "scala.collection.View$", ({
  cf: 1,
  a: 1,
  x: 1
}));
var $n_sc_View$;
function $m_sc_View$() {
  if ((!$n_sc_View$)) {
    $n_sc_View$ = new $c_sc_View$();
  }
  return $n_sc_View$;
}
/** @constructor */
function $c_sci_BitmapIndexedMapNode(dataMap, nodeMap, content, originalHashes, size, cachedJavaKeySetHashCode) {
  this.D = 0;
  this.H = 0;
  this.Z = null;
  this.aH = null;
  this.an = 0;
  this.aO = 0;
  this.D = dataMap;
  this.H = nodeMap;
  this.Z = content;
  this.aH = originalHashes;
  this.an = size;
  this.aO = cachedJavaKeySetHashCode;
}
$p = $c_sci_BitmapIndexedMapNode.prototype = new $h_sci_MapNode();
$p.constructor = $c_sci_BitmapIndexedMapNode;
/** @constructor */
function $h_sci_BitmapIndexedMapNode() {
}
$h_sci_BitmapIndexedMapNode.prototype = $p;
$p.ay = (function() {
  return this.an;
});
$p.c6 = (function() {
  return this.aO;
});
$p.bt = (function(index) {
  return this.Z.a[(index << 1)];
});
$p.bu = (function(index) {
  return this.Z.a[((1 + (index << 1)) | 0)];
});
$p.gm = (function(index) {
  return new $c_T2(this.Z.a[(index << 1)], this.Z.a[((1 + (index << 1)) | 0)]);
});
$p.cM = (function(index) {
  return this.aH.a[index];
});
$p.bT = (function(index) {
  return this.Z.a[((((this.Z.a.length - 1) | 0) - index) | 0)];
});
$p.f4 = (function(key, originalHash, keyHash, shift) {
  var mask = $m_sci_Node$().bV(keyHash, shift);
  var bitpos = $m_sci_Node$().bI(mask);
  if (((this.D & bitpos) !== 0)) {
    var index = $m_sci_Node$().bi(this.D, mask, bitpos);
    if ($m_sr_BoxesRunTime$().h(key, this.bt(index))) {
      return this.bu(index);
    } else {
      throw new $c_ju_NoSuchElementException(("key not found: " + key));
    }
  } else if (((this.H & bitpos) !== 0)) {
    return this.bT($m_sci_Node$().bi(this.H, mask, bitpos)).f4(key, originalHash, keyHash, ((5 + shift) | 0));
  } else {
    throw new $c_ju_NoSuchElementException(("key not found: " + key));
  }
});
$p.eA = (function(key, originalHash, keyHash, shift) {
  var mask = $m_sci_Node$().bV(keyHash, shift);
  var bitpos = $m_sci_Node$().bI(mask);
  if (((this.D & bitpos) !== 0)) {
    var index = $m_sci_Node$().bi(this.D, mask, bitpos);
    return ($m_sr_BoxesRunTime$().h(key, this.bt(index)) ? new $c_s_Some(this.bu(index)) : $m_s_None$());
  } else {
    return (((this.H & bitpos) !== 0) ? this.bT($m_sci_Node$().bi(this.H, mask, bitpos)).eA(key, originalHash, keyHash, ((5 + shift) | 0)) : $m_s_None$());
  }
});
$p.fd = (function(key, originalHash, keyHash, shift, f) {
  var mask = $m_sci_Node$().bV(keyHash, shift);
  var bitpos = $m_sci_Node$().bI(mask);
  if (((this.D & bitpos) !== 0)) {
    var index = $m_sci_Node$().bi(this.D, mask, bitpos);
    return ($m_sr_BoxesRunTime$().h(key, this.bt(index)) ? this.bu(index) : f.aw());
  } else {
    return (((this.H & bitpos) !== 0) ? this.bT($m_sci_Node$().bi(this.H, mask, bitpos)).fd(key, originalHash, keyHash, ((5 + shift) | 0), f) : f.aw());
  }
});
$p.ev = (function(key, originalHash, keyHash, shift) {
  var mask = $m_sci_Node$().bV(keyHash, shift);
  var bitpos = $m_sci_Node$().bI(mask);
  if (((this.D & bitpos) !== 0)) {
    var index = $m_sci_Node$().bi(this.D, mask, bitpos);
    return ((this.aH.a[index] === originalHash) && $m_sr_BoxesRunTime$().h(key, this.bt(index)));
  } else {
    return (((this.H & bitpos) !== 0) && this.bT($m_sci_Node$().bi(this.H, mask, bitpos)).ev(key, originalHash, keyHash, ((5 + shift) | 0)));
  }
});
$p.gC = (function(key, value, originalHash, keyHash, shift, replaceValue) {
  var mask = $m_sci_Node$().bV(keyHash, shift);
  var bitpos = $m_sci_Node$().bI(mask);
  if (((this.D & bitpos) !== 0)) {
    var index = $m_sci_Node$().bi(this.D, mask, bitpos);
    var key0 = this.bt(index);
    var key0UnimprovedHash = this.cM(index);
    if (((key0UnimprovedHash === originalHash) && $m_sr_BoxesRunTime$().h(key0, key))) {
      if (replaceValue) {
        var value0 = this.bu(index);
        return ((Object.is(key0, key) && Object.is(value0, value)) ? this : this.ha(bitpos, key, value));
      } else {
        return this;
      }
    } else {
      var value0$2 = this.bu(index);
      var key0Hash = $m_sc_Hashing$().b9(key0UnimprovedHash);
      return this.h7(bitpos, key0Hash, this.fi(key0, value0$2, key0UnimprovedHash, key0Hash, key, value, originalHash, keyHash, ((5 + shift) | 0)));
    }
  } else if (((this.H & bitpos) !== 0)) {
    var index$2 = $m_sci_Node$().bi(this.H, mask, bitpos);
    var subNode = this.bT(index$2);
    var subNodeNew$2 = subNode.gD(key, value, originalHash, keyHash, ((5 + shift) | 0), replaceValue);
    return ((subNodeNew$2 === subNode) ? this : this.ga(bitpos, subNode, subNodeNew$2));
  } else {
    return this.h6(bitpos, key, originalHash, keyHash, value);
  }
});
$p.gr = (function(key, originalHash, keyHash, shift) {
  var mask = $m_sci_Node$().bV(keyHash, shift);
  var bitpos = $m_sci_Node$().bI(mask);
  if (((this.D & bitpos) !== 0)) {
    var index = $m_sci_Node$().bi(this.D, mask, bitpos);
    if ($m_sr_BoxesRunTime$().h(this.bt(index), key)) {
      if ((($m_jl_Integer$().bS(this.D) === 2) && ($m_jl_Integer$().bS(this.H) === 0))) {
        var newDataMap = ((shift === 0) ? (this.D ^ bitpos) : $m_sci_Node$().bI($m_sci_Node$().bV(keyHash, 0)));
        if ((index === 0)) {
          var xs = new $c_sjsr_WrappedVarArgs([this.bt(1), this.bu(1)]);
          var array$1 = new $ac_O(xs.p());
          var iterator = $ct_sc_IndexedSeqView$IndexedSeqViewIterator__sc_IndexedSeqView__(new $c_sc_IndexedSeqView$IndexedSeqViewIterator(), new $c_sc_IndexedSeqView$Id(xs));
          var i$2 = 0;
          while ((iterator.aD > 0)) {
            array$1.a[i$2] = iterator.g();
            i$2 = ((1 + i$2) | 0);
          }
          return new $c_sci_BitmapIndexedMapNode(newDataMap, 0, array$1, new $ac_I(new Int32Array([this.aH.a[1]])), 1, $m_sc_Hashing$().b9(this.cM(1)));
        } else {
          var xs$1 = new $c_sjsr_WrappedVarArgs([this.bt(0), this.bu(0)]);
          var array$3 = new $ac_O(xs$1.p());
          var iterator$1 = $ct_sc_IndexedSeqView$IndexedSeqViewIterator__sc_IndexedSeqView__(new $c_sc_IndexedSeqView$IndexedSeqViewIterator(), new $c_sc_IndexedSeqView$Id(xs$1));
          var i$3 = 0;
          while ((iterator$1.aD > 0)) {
            array$3.a[i$3] = iterator$1.g();
            i$3 = ((1 + i$3) | 0);
          }
          return new $c_sci_BitmapIndexedMapNode(newDataMap, 0, array$3, new $ac_I(new Int32Array([this.aH.a[0]])), 1, $m_sc_Hashing$().b9(this.cM(0)));
        }
      } else {
        return this.h9(bitpos, keyHash);
      }
    } else {
      return this;
    }
  } else if (((this.H & bitpos) !== 0)) {
    var index$2 = $m_sci_Node$().bi(this.H, mask, bitpos);
    var subNode = this.bT(index$2);
    var subNodeNew = subNode.gs(key, originalHash, keyHash, ((5 + shift) | 0));
    if ((subNodeNew === subNode)) {
      return this;
    }
    var subNodeNewSize = subNodeNew.ay();
    return ((subNodeNewSize === 1) ? ((this.an === subNode.ay()) ? subNodeNew : this.h8(bitpos, subNode, subNodeNew)) : ((subNodeNewSize > 1) ? this.ga(bitpos, subNode, subNodeNew) : this));
  } else {
    return this;
  }
});
$p.fi = (function(key0, value0, originalHash0, keyHash0, key1, value1, originalHash1, keyHash1, shift) {
  if ((shift >= 32)) {
    return new $c_sci_HashCollisionMapNode(originalHash0, keyHash0, $m_sci_Vector$().gi(new $c_sjsr_WrappedVarArgs([new $c_T2(key0, value0), new $c_T2(key1, value1)])));
  } else {
    var mask0 = $m_sci_Node$().bV(keyHash0, shift);
    var mask1 = $m_sci_Node$().bV(keyHash1, shift);
    var newCachedHash = ((keyHash0 + keyHash1) | 0);
    if ((mask0 !== mask1)) {
      var dataMap = ($m_sci_Node$().bI(mask0) | $m_sci_Node$().bI(mask1));
      if ((mask0 < mask1)) {
        var xs = new $c_sjsr_WrappedVarArgs([key0, value0, key1, value1]);
        var array$2 = new $ac_O(xs.p());
        var iterator = $ct_sc_IndexedSeqView$IndexedSeqViewIterator__sc_IndexedSeqView__(new $c_sc_IndexedSeqView$IndexedSeqViewIterator(), new $c_sc_IndexedSeqView$Id(xs));
        var i = 0;
        while ((iterator.aD > 0)) {
          array$2.a[i] = iterator.g();
          i = ((1 + i) | 0);
        }
        return new $c_sci_BitmapIndexedMapNode(dataMap, 0, array$2, new $ac_I(new Int32Array([originalHash0, originalHash1])), 2, newCachedHash);
      } else {
        var xs$1 = new $c_sjsr_WrappedVarArgs([key1, value1, key0, value0]);
        var array$4 = new $ac_O(xs$1.p());
        var iterator$1 = $ct_sc_IndexedSeqView$IndexedSeqViewIterator__sc_IndexedSeqView__(new $c_sc_IndexedSeqView$IndexedSeqViewIterator(), new $c_sc_IndexedSeqView$Id(xs$1));
        var i$1 = 0;
        while ((iterator$1.aD > 0)) {
          array$4.a[i$1] = iterator$1.g();
          i$1 = ((1 + i$1) | 0);
        }
        return new $c_sci_BitmapIndexedMapNode(dataMap, 0, array$4, new $ac_I(new Int32Array([originalHash1, originalHash0])), 2, newCachedHash);
      }
    } else {
      var nodeMap = $m_sci_Node$().bI(mask0);
      var node = this.fi(key0, value0, originalHash0, keyHash0, key1, value1, originalHash1, keyHash1, ((5 + shift) | 0));
      var xs$2 = new $c_sjsr_WrappedVarArgs([node]);
      var array$6 = new $ac_O(xs$2.p());
      var iterator$2 = $ct_sc_IndexedSeqView$IndexedSeqViewIterator__sc_IndexedSeqView__(new $c_sc_IndexedSeqView$IndexedSeqViewIterator(), new $c_sc_IndexedSeqView$Id(xs$2));
      var i$2 = 0;
      while ((iterator$2.aD > 0)) {
        array$6.a[i$2] = iterator$2.g();
        i$2 = ((1 + i$2) | 0);
      }
      return new $c_sci_BitmapIndexedMapNode(0, nodeMap, array$6, $m_s_Array$EmptyArrays$().eL, node.ay(), node.c6());
    }
  }
});
$p.ff = (function() {
  return (this.H !== 0);
});
$p.fj = (function() {
  return $m_jl_Integer$().bS(this.H);
});
$p.eB = (function() {
  return (this.D !== 0);
});
$p.fk = (function() {
  return $m_jl_Integer$().bS(this.D);
});
$p.cY = (function(bitpos) {
  return $m_jl_Integer$().bS((this.D & ((bitpos - 1) | 0)));
});
$p.eD = (function(bitpos) {
  return $m_jl_Integer$().bS((this.H & ((bitpos - 1) | 0)));
});
$p.ha = (function(bitpos, newKey, newValue) {
  var dataIx = this.cY(bitpos);
  var idx = (dataIx << 1);
  var src = this.Z;
  var dst = new $ac_O(src.a.length);
  var length = src.a.length;
  src.j(0, dst, 0, length);
  dst.a[((1 + idx) | 0)] = newValue;
  return new $c_sci_BitmapIndexedMapNode(this.D, this.H, dst, this.aH, this.an, this.aO);
});
$p.ga = (function(bitpos, oldNode, newNode) {
  var idx = ((((this.Z.a.length - 1) | 0) - this.eD(bitpos)) | 0);
  var src = this.Z;
  var dst = new $ac_O(src.a.length);
  var length = src.a.length;
  src.j(0, dst, 0, length);
  dst.a[idx] = newNode;
  return new $c_sci_BitmapIndexedMapNode(this.D, this.H, dst, this.aH, ((((this.an - oldNode.ay()) | 0) + newNode.ay()) | 0), ((((this.aO - oldNode.c6()) | 0) + newNode.c6()) | 0));
});
$p.h6 = (function(bitpos, key, originalHash, keyHash, value) {
  var dataIx = this.cY(bitpos);
  var idx = (dataIx << 1);
  var src = this.Z;
  var dst = new $ac_O(((2 + src.a.length) | 0));
  src.j(0, dst, 0, idx);
  dst.a[idx] = key;
  dst.a[((1 + idx) | 0)] = value;
  var destPos = ((2 + idx) | 0);
  var length = ((src.a.length - idx) | 0);
  src.j(idx, dst, destPos, length);
  var dstHashes = this.gn(this.aH, dataIx, originalHash);
  return new $c_sci_BitmapIndexedMapNode((this.D | bitpos), this.H, dst, dstHashes, ((1 + this.an) | 0), ((this.aO + keyHash) | 0));
});
$p.h9 = (function(bitpos, keyHash) {
  var dataIx = this.cY(bitpos);
  var idx = (dataIx << 1);
  var src = this.Z;
  var dst = new $ac_O(((src.a.length - 2) | 0));
  src.j(0, dst, 0, idx);
  var srcPos = ((2 + idx) | 0);
  var length = ((((src.a.length - idx) | 0) - 2) | 0);
  src.j(srcPos, dst, idx, length);
  var dstHashes = this.fl(this.aH, dataIx);
  return new $c_sci_BitmapIndexedMapNode((this.D ^ bitpos), this.H, dst, dstHashes, ((this.an - 1) | 0), ((this.aO - keyHash) | 0));
});
$p.hN = (function(bitpos, keyHash, node) {
  var dataIx = this.cY(bitpos);
  var idxOld = (dataIx << 1);
  var idxNew = ((((this.Z.a.length - 2) | 0) - this.eD(bitpos)) | 0);
  var src = this.Z;
  var dst = new $ac_O(((src.a.length - 1) | 0));
  src.j(0, dst, 0, idxOld);
  var srcPos = ((2 + idxOld) | 0);
  var length = ((idxNew - idxOld) | 0);
  src.j(srcPos, dst, idxOld, length);
  dst.a[idxNew] = node;
  var srcPos$1 = ((2 + idxNew) | 0);
  var destPos = ((1 + idxNew) | 0);
  var length$1 = ((((src.a.length - idxNew) | 0) - 2) | 0);
  src.j(srcPos$1, dst, destPos, length$1);
  var dstHashes = this.fl(this.aH, dataIx);
  this.D = (this.D ^ bitpos);
  this.H = (this.H | bitpos);
  this.Z = dst;
  this.aH = dstHashes;
  this.an = ((((this.an - 1) | 0) + node.ay()) | 0);
  this.aO = ((((this.aO - keyHash) | 0) + node.c6()) | 0);
  return this;
});
$p.h7 = (function(bitpos, keyHash, node) {
  var dataIx = this.cY(bitpos);
  var idxOld = (dataIx << 1);
  var idxNew = ((((this.Z.a.length - 2) | 0) - this.eD(bitpos)) | 0);
  var src = this.Z;
  var dst = new $ac_O(((src.a.length - 1) | 0));
  src.j(0, dst, 0, idxOld);
  var srcPos = ((2 + idxOld) | 0);
  var length = ((idxNew - idxOld) | 0);
  src.j(srcPos, dst, idxOld, length);
  dst.a[idxNew] = node;
  var srcPos$1 = ((2 + idxNew) | 0);
  var destPos = ((1 + idxNew) | 0);
  var length$1 = ((((src.a.length - idxNew) | 0) - 2) | 0);
  src.j(srcPos$1, dst, destPos, length$1);
  var dstHashes = this.fl(this.aH, dataIx);
  return new $c_sci_BitmapIndexedMapNode((this.D ^ bitpos), (this.H | bitpos), dst, dstHashes, ((((this.an - 1) | 0) + node.ay()) | 0), ((((this.aO - keyHash) | 0) + node.c6()) | 0));
});
$p.h8 = (function(bitpos, oldNode, node) {
  var idxOld = ((((this.Z.a.length - 1) | 0) - this.eD(bitpos)) | 0);
  var dataIxNew = this.cY(bitpos);
  var idxNew = (dataIxNew << 1);
  var key = node.bt(0);
  var value = node.bu(0);
  var src = this.Z;
  var dst = new $ac_O(((1 + src.a.length) | 0));
  src.j(0, dst, 0, idxNew);
  dst.a[idxNew] = key;
  dst.a[((1 + idxNew) | 0)] = value;
  var destPos = ((2 + idxNew) | 0);
  var length = ((idxOld - idxNew) | 0);
  src.j(idxNew, dst, destPos, length);
  var srcPos = ((1 + idxOld) | 0);
  var destPos$1 = ((2 + idxOld) | 0);
  var length$1 = ((((src.a.length - idxOld) | 0) - 1) | 0);
  src.j(srcPos, dst, destPos$1, length$1);
  var hash = node.cM(0);
  var dstHashes = this.gn(this.aH, dataIxNew, hash);
  return new $c_sci_BitmapIndexedMapNode((this.D | bitpos), (this.H ^ bitpos), dst, dstHashes, ((1 + ((this.an - oldNode.ay()) | 0)) | 0), ((((this.aO - oldNode.c6()) | 0) + node.c6()) | 0));
});
$p.d0 = (function(f) {
  var iN = $m_jl_Integer$().bS(this.D);
  var i$1 = 0;
  while ((i$1 < iN)) {
    f.eu(this.bt(i$1), this.bu(i$1));
    i$1 = ((1 + i$1) | 0);
  }
  var jN = $m_jl_Integer$().bS(this.H);
  var j = 0;
  while ((j < jN)) {
    this.bT(j).d0(f);
    j = ((1 + j) | 0);
  }
});
$p.P = (function(that) {
  if ((that instanceof $c_sci_BitmapIndexedMapNode)) {
    if ((this === that)) {
      return true;
    } else if ((((((this.aO === that.aO) && (this.H === that.H)) && (this.D === that.D)) && (this.an === that.an)) && $m_ju_Arrays$().hg(this.aH, that.aH))) {
      var a1 = this.Z;
      var a2 = that.Z;
      var length = this.Z.a.length;
      if ((a1 === a2)) {
        return true;
      } else {
        var isEqual = true;
        var i = 0;
        while ((isEqual && (i < length))) {
          isEqual = $m_sr_BoxesRunTime$().h(a1.a[i], a2.a[i]);
          i = ((1 + i) | 0);
        }
        return isEqual;
      }
    } else {
      return false;
    }
  } else {
    return false;
  }
});
$p.S = (function() {
  throw $ct_jl_UnsupportedOperationException__T__(new $c_jl_UnsupportedOperationException(), "Trie nodes do not support hashing.");
});
$p.A = (function() {
  var i = $systemIdentityHashCode(this);
  return (($objectClassName(this) + "@") + (i >>> 0.0).toString(16));
});
$p.g8 = (function() {
  var this$1 = this.Z;
  var contentClone = this$1.d();
  var contentLength = contentClone.a.length;
  var i$1 = ($m_jl_Integer$().bS(this.D) << 1);
  while ((i$1 < contentLength)) {
    contentClone.a[i$1] = contentClone.a[i$1].g9();
    i$1 = ((1 + i$1) | 0);
  }
  return new $c_sci_BitmapIndexedMapNode(this.D, this.H, contentClone, this.aH.d(), this.an, this.aO);
});
$p.fc = (function(index) {
  return this.bT(index);
});
$p.gD = (function(key, value, originalHash, hash, shift, replaceValue) {
  return this.gC(key, value, originalHash, hash, shift, replaceValue);
});
$p.gs = (function(key, originalHash, hash, shift) {
  return this.gr(key, originalHash, hash, shift);
});
$p.g9 = (function() {
  return this.g8();
});
function $isArrayOf_sci_BitmapIndexedMapNode(obj, depth) {
  return (!(!(((obj && obj.$classData) && (obj.$classData.D === depth)) && obj.$classData.B.n.aM)));
}
var $d_sci_BitmapIndexedMapNode = new $TypeData().i($c_sci_BitmapIndexedMapNode, "scala.collection.immutable.BitmapIndexedMapNode", ({
  aM: 1,
  aV: 1,
  am: 1
}));
/** @constructor */
function $c_sci_HashCollisionMapNode(originalHash, hash, content) {
  this.eO = 0;
  this.cw = 0;
  this.a3 = null;
  this.eO = originalHash;
  this.cw = hash;
  this.a3 = content;
  $m_s_Predef$().i5((this.a3.p() >= 2));
}
$p = $c_sci_HashCollisionMapNode.prototype = new $h_sci_MapNode();
$p.constructor = $c_sci_HashCollisionMapNode;
/** @constructor */
function $h_sci_HashCollisionMapNode() {
}
$h_sci_HashCollisionMapNode.prototype = $p;
$p.dp = (function(key) {
  var iter = this.a3.k();
  var i = 0;
  while (iter.m()) {
    if ($m_sr_BoxesRunTime$().h(iter.g().az, key)) {
      return i;
    }
    i = ((1 + i) | 0);
  }
  return (-1);
});
$p.ay = (function() {
  return this.a3.p();
});
$p.f4 = (function(key, originalHash, hash, shift) {
  var this$1 = this.eA(key, originalHash, hash, shift);
  return (this$1.l() ? $m_sc_Iterator$().ab.g() : this$1.e0());
});
$p.eA = (function(key, originalHash, hash, shift) {
  if ((this.cw === hash)) {
    var index = this.dp(key);
    return ((index >= 0) ? new $c_s_Some(this.a3.x(index).aA) : $m_s_None$());
  } else {
    return $m_s_None$();
  }
});
$p.fd = (function(key, originalHash, hash, shift, f) {
  if ((this.cw === hash)) {
    var x36 = this.dp(key);
    if ((x36 === (-1))) {
      return f.aw();
    }
    return this.a3.x(x36).aA;
  } else {
    return f.aw();
  }
});
$p.ev = (function(key, originalHash, hash, shift) {
  return ((this.cw === hash) && (this.dp(key) >= 0));
});
$p.gD = (function(key, value, originalHash, hash, shift, replaceValue) {
  var index = this.dp(key);
  return ((index >= 0) ? (replaceValue ? (Object.is(this.a3.x(index).aA, value) ? this : new $c_sci_HashCollisionMapNode(originalHash, hash, this.a3.cO(index, new $c_T2(key, value)))) : this) : new $c_sci_HashCollisionMapNode(originalHash, hash, this.a3.cI(new $c_T2(key, value))));
});
$p.gs = (function(key, originalHash, hash, shift) {
  if ((!this.ev(key, originalHash, hash, shift))) {
    return this;
  } else {
    var updatedContent = this.a3.hm(new $c_sr_AbstractFunction1_$$Lambda$7afc3dd0acc1681fb022ef921c83979087aaa919(((keyValuePair$2) => $m_sr_BoxesRunTime$().h(keyValuePair$2.az, key))), true);
    if ((updatedContent.p() === 1)) {
      var x37 = updatedContent.x(0);
      var \u03b48$ = x37;
      var k$2 = \u03b48$.az;
      var v$2 = \u03b48$.aA;
      var $x_1 = $m_sci_Node$().bI($m_sci_Node$().bV(hash, 0));
      var xs = new $c_sjsr_WrappedVarArgs([k$2, v$2]);
      var array$1 = new $ac_O(xs.p());
      var iterator = $ct_sc_IndexedSeqView$IndexedSeqViewIterator__sc_IndexedSeqView__(new $c_sc_IndexedSeqView$IndexedSeqViewIterator(), new $c_sc_IndexedSeqView$Id(xs));
      var i = 0;
      while ((iterator.aD > 0)) {
        array$1.a[i] = iterator.g();
        i = ((1 + i) | 0);
      }
      return new $c_sci_BitmapIndexedMapNode($x_1, 0, array$1, new $ac_I(new Int32Array([originalHash])), 1, hash);
    } else {
      return new $c_sci_HashCollisionMapNode(originalHash, hash, updatedContent);
    }
  }
});
$p.ff = (function() {
  return false;
});
$p.fj = (function() {
  return 0;
});
$p.bT = (function(index) {
  throw $ct_jl_IndexOutOfBoundsException__T__(new $c_jl_IndexOutOfBoundsException(), "No sub-nodes present in hash-collision leaf node.");
});
$p.eB = (function() {
  return true;
});
$p.fk = (function() {
  return this.a3.p();
});
$p.bt = (function(index) {
  return this.a3.x(index).az;
});
$p.bu = (function(index) {
  return this.a3.x(index).aA;
});
$p.gm = (function(index) {
  return this.a3.x(index);
});
$p.cM = (function(index) {
  return this.eO;
});
$p.d0 = (function(f) {
  this.a3.dl(new $c_sr_AbstractFunction1_$$Lambda$7afc3dd0acc1681fb022ef921c83979087aaa919(((x$1$2) => {
    var k = x$1$2.az;
    var v = x$1$2.aA;
    return f.eu(k, v);
  })));
});
$p.P = (function(that) {
  if ((that instanceof $c_sci_HashCollisionMapNode)) {
    if ((this === that)) {
      return true;
    } else if (((this.cw === that.cw) && (this.a3.p() === that.a3.p()))) {
      var iter = this.a3.k();
      while (iter.m()) {
        var x47 = iter.g();
        var \u03b412$ = x47;
        var key$2 = \u03b412$.az;
        var value$2 = \u03b412$.aA;
        var index = that.dp(key$2);
        if (((index < 0) || (!$m_sr_BoxesRunTime$().h(value$2, that.a3.x(index).aA)))) {
          return false;
        }
      }
      return true;
    } else {
      return false;
    }
  } else {
    return false;
  }
});
$p.S = (function() {
  throw $ct_jl_UnsupportedOperationException__T__(new $c_jl_UnsupportedOperationException(), "Trie nodes do not support hashing.");
});
$p.A = (function() {
  var i = $systemIdentityHashCode(this);
  return (($objectClassName(this) + "@") + (i >>> 0.0).toString(16));
});
$p.c6 = (function() {
  return Math.imul(this.a3.p(), this.cw);
});
$p.fc = (function(index) {
  return this.bT(index);
});
$p.g9 = (function() {
  return new $c_sci_HashCollisionMapNode(this.eO, this.cw, this.a3);
});
function $isArrayOf_sci_HashCollisionMapNode(obj, depth) {
  return (!(!(((obj && obj.$classData) && (obj.$classData.D === depth)) && obj.$classData.B.n.aO)));
}
var $d_sci_HashCollisionMapNode = new $TypeData().i($c_sci_HashCollisionMapNode, "scala.collection.immutable.HashCollisionMapNode", ({
  aO: 1,
  aV: 1,
  am: 1
}));
/** @constructor */
function $c_sci_HashMap$() {
  this.eP = null;
  $n_sci_HashMap$ = this;
  this.eP = new $c_sci_HashMap($m_sci_MapNode$().fJ);
}
$p = $c_sci_HashMap$.prototype = new $h_O();
$p.constructor = $c_sci_HashMap$;
/** @constructor */
function $h_sci_HashMap$() {
}
$h_sci_HashMap$.prototype = $p;
$p.ho = (function(source) {
  return ((source instanceof $c_sci_HashMap) ? source : new $c_sci_HashMapBuilder().f3(source).fm());
});
$p.aq = (function(it) {
  return this.ho(it);
});
var $d_sci_HashMap$ = new $TypeData().i($c_sci_HashMap$, "scala.collection.immutable.HashMap$", ({
  cl: 1,
  a: 1,
  ag: 1
}));
var $n_sci_HashMap$;
function $m_sci_HashMap$() {
  if ((!$n_sci_HashMap$)) {
    $n_sci_HashMap$ = new $c_sci_HashMap$();
  }
  return $n_sci_HashMap$;
}
/** @constructor */
function $c_sci_Map$() {
}
$p = $c_sci_Map$.prototype = new $h_O();
$p.constructor = $c_sci_Map$;
/** @constructor */
function $h_sci_Map$() {
}
$h_sci_Map$.prototype = $p;
$p.gh = (function(it) {
  if ($is_sci_Iterable(it)) {
    if (it.l()) {
      return $m_sci_Map$EmptyMap$();
    }
  }
  if ((it instanceof $c_sci_HashMap)) {
    return it;
  }
  if ((it instanceof $c_sci_Map$Map1)) {
    return it;
  }
  if ((it instanceof $c_sci_Map$Map2)) {
    return it;
  }
  if ((it instanceof $c_sci_Map$Map3)) {
    return it;
  }
  if ((it instanceof $c_sci_Map$Map4)) {
    return it;
  }
  if (false) {
    return it;
  }
  if (false) {
    return it;
  }
  if (false) {
    return it;
  }
  if (false) {
    return it;
  }
  if (false) {
    return it;
  }
  if (false) {
    return it;
  }
  if (false) {
    return it;
  }
  return new $c_sci_MapBuilderImpl().fZ(it).gt();
});
$p.aq = (function(it) {
  return this.gh(it);
});
var $d_sci_Map$ = new $TypeData().i($c_sci_Map$, "scala.collection.immutable.Map$", ({
  cz: 1,
  a: 1,
  ag: 1
}));
var $n_sci_Map$;
function $m_sci_Map$() {
  if ((!$n_sci_Map$)) {
    $n_sci_Map$ = new $c_sci_Map$();
  }
  return $n_sci_Map$;
}
function $f_scm_Builder__sizeHint__sc_IterableOnce__I__V($thiz, coll, delta) {
  var x1 = coll.r();
  if ((x1 === (-1))) {
    return (void 0);
  }
  var that = ((x1 + delta) | 0);
  $thiz.bk(((that < 0) ? 0 : that));
}
function $isArrayOf_s_math_ScalaNumber(obj, depth) {
  return (!(!(((obj && obj.$classData) && (obj.$classData.D === depth)) && obj.$classData.B.n.du)));
}
/** @constructor */
function $c_sr_AbstractFunction0_$$Lambda$07eded5776954a9c145e92c329afd52873ad179c(f) {
  this.fT = null;
  this.fT = f;
}
$p = $c_sr_AbstractFunction0_$$Lambda$07eded5776954a9c145e92c329afd52873ad179c.prototype = new $h_sr_AbstractFunction0();
$p.constructor = $c_sr_AbstractFunction0_$$Lambda$07eded5776954a9c145e92c329afd52873ad179c;
/** @constructor */
function $h_sr_AbstractFunction0_$$Lambda$07eded5776954a9c145e92c329afd52873ad179c() {
}
$h_sr_AbstractFunction0_$$Lambda$07eded5776954a9c145e92c329afd52873ad179c.prototype = $p;
$p.aw = (function() {
  return (0, this.fT)();
});
var $d_sr_AbstractFunction0_$$Lambda$07eded5776954a9c145e92c329afd52873ad179c = new $TypeData().i($c_sr_AbstractFunction0_$$Lambda$07eded5776954a9c145e92c329afd52873ad179c, "scala.runtime.AbstractFunction0.$$Lambda$07eded5776954a9c145e92c329afd52873ad179c", ({
  dE: 1,
  dD: 1,
  bR: 1
}));
/** @constructor */
function $c_sr_AbstractFunction1_$$Lambda$7afc3dd0acc1681fb022ef921c83979087aaa919(f) {
  this.fU = null;
  this.fU = f;
}
$p = $c_sr_AbstractFunction1_$$Lambda$7afc3dd0acc1681fb022ef921c83979087aaa919.prototype = new $h_sr_AbstractFunction1();
$p.constructor = $c_sr_AbstractFunction1_$$Lambda$7afc3dd0acc1681fb022ef921c83979087aaa919;
/** @constructor */
function $h_sr_AbstractFunction1_$$Lambda$7afc3dd0acc1681fb022ef921c83979087aaa919() {
}
$h_sr_AbstractFunction1_$$Lambda$7afc3dd0acc1681fb022ef921c83979087aaa919.prototype = $p;
$p.f = (function(x0) {
  return (0, this.fU)(x0);
});
var $d_sr_AbstractFunction1_$$Lambda$7afc3dd0acc1681fb022ef921c83979087aaa919 = new $TypeData().i($c_sr_AbstractFunction1_$$Lambda$7afc3dd0acc1681fb022ef921c83979087aaa919, "scala.runtime.AbstractFunction1.$$Lambda$7afc3dd0acc1681fb022ef921c83979087aaa919", ({
  dG: 1,
  dF: 1,
  i: 1
}));
/** @constructor */
function $c_sr_AbstractFunction2_$$Lambda$b4228bd32034ae3b2f0c5fc896319aa4b79b55f8(f) {
  this.fV = null;
  this.fV = f;
}
$p = $c_sr_AbstractFunction2_$$Lambda$b4228bd32034ae3b2f0c5fc896319aa4b79b55f8.prototype = new $h_sr_AbstractFunction2();
$p.constructor = $c_sr_AbstractFunction2_$$Lambda$b4228bd32034ae3b2f0c5fc896319aa4b79b55f8;
/** @constructor */
function $h_sr_AbstractFunction2_$$Lambda$b4228bd32034ae3b2f0c5fc896319aa4b79b55f8() {
}
$h_sr_AbstractFunction2_$$Lambda$b4228bd32034ae3b2f0c5fc896319aa4b79b55f8.prototype = $p;
$p.eu = (function(x0, x1) {
  return (0, this.fV)(x0, x1);
});
var $d_sr_AbstractFunction2_$$Lambda$b4228bd32034ae3b2f0c5fc896319aa4b79b55f8 = new $TypeData().i($c_sr_AbstractFunction2_$$Lambda$b4228bd32034ae3b2f0c5fc896319aa4b79b55f8, "scala.runtime.AbstractFunction2.$$Lambda$b4228bd32034ae3b2f0c5fc896319aa4b79b55f8", ({
  dI: 1,
  dH: 1,
  aD: 1
}));
function $s_Lsculpter_TokenType$__NUM_NEG__Lsculpter_TokenType() {
  $m_Lsculpter_TokenType$();
  return $t_Lsculpter_TokenType$__NUM_NEG;
}
function $s_Lsculpter_TokenType$__ENTER__Lsculpter_TokenType() {
  $m_Lsculpter_TokenType$();
  return $t_Lsculpter_TokenType$__ENTER;
}
function $s_Lsculpter_TokenType$__QUESTION__Lsculpter_TokenType() {
  $m_Lsculpter_TokenType$();
  return $t_Lsculpter_TokenType$__QUESTION;
}
function $s_Lsculpter_TokenType$__JMP__Lsculpter_TokenType() {
  $m_Lsculpter_TokenType$();
  return $t_Lsculpter_TokenType$__JMP;
}
function $s_Lsculpter_TokenType$__CMP__Lsculpter_TokenType() {
  $m_Lsculpter_TokenType$();
  return $t_Lsculpter_TokenType$__CMP;
}
function $s_Lsculpter_TokenType$__PUSH__Lsculpter_TokenType() {
  $m_Lsculpter_TokenType$();
  return $t_Lsculpter_TokenType$__PUSH;
}
function $s_Lsculpter_TokenType$__POP__Lsculpter_TokenType() {
  $m_Lsculpter_TokenType$();
  return $t_Lsculpter_TokenType$__POP;
}
function $s_Lsculpter_TokenType$__DUP__Lsculpter_TokenType() {
  $m_Lsculpter_TokenType$();
  return $t_Lsculpter_TokenType$__DUP;
}
function $s_Lsculpter_TokenType$__MOV__Lsculpter_TokenType() {
  $m_Lsculpter_TokenType$();
  return $t_Lsculpter_TokenType$__MOV;
}
function $s_Lsculpter_TokenType$__ADD__Lsculpter_TokenType() {
  $m_Lsculpter_TokenType$();
  return $t_Lsculpter_TokenType$__ADD;
}
function $s_Lsculpter_TokenType$__SUB__Lsculpter_TokenType() {
  $m_Lsculpter_TokenType$();
  return $t_Lsculpter_TokenType$__SUB;
}
function $s_Lsculpter_TokenType$__MUL__Lsculpter_TokenType() {
  $m_Lsculpter_TokenType$();
  return $t_Lsculpter_TokenType$__MUL;
}
function $s_Lsculpter_TokenType$__DIV__Lsculpter_TokenType() {
  $m_Lsculpter_TokenType$();
  return $t_Lsculpter_TokenType$__DIV;
}
function $s_Lsculpter_TokenType$__MOD__Lsculpter_TokenType() {
  $m_Lsculpter_TokenType$();
  return $t_Lsculpter_TokenType$__MOD;
}
function $s_Lsculpter_TokenType$__NEG__Lsculpter_TokenType() {
  $m_Lsculpter_TokenType$();
  return $t_Lsculpter_TokenType$__NEG;
}
function $s_Lsculpter_TokenType$__NUMBER__Lsculpter_TokenType() {
  $m_Lsculpter_TokenType$();
  return $t_Lsculpter_TokenType$__NUMBER;
}
function $s_Lsculpter_TokenType$__STACK__Lsculpter_TokenType() {
  $m_Lsculpter_TokenType$();
  return $t_Lsculpter_TokenType$__STACK;
}
function $s_Lsculpter_TokenType$__NIL__Lsculpter_TokenType() {
  $m_Lsculpter_TokenType$();
  return $t_Lsculpter_TokenType$__NIL;
}
function $s_Lsculpter_TokenType$__EOF__Lsculpter_TokenType() {
  $m_Lsculpter_TokenType$();
  return $t_Lsculpter_TokenType$__EOF;
}
/** @constructor */
function $c_Lsculpter_TokenType$() {
  $n_Lsculpter_TokenType$ = this;
  $t_Lsculpter_TokenType$__NUM_NEG = new $c_Lsculpter_TokenType$$anon$1("NUM_NEG", 0);
  $t_Lsculpter_TokenType$__ENTER = new $c_Lsculpter_TokenType$$anon$1("ENTER", 1);
  $t_Lsculpter_TokenType$__QUESTION = new $c_Lsculpter_TokenType$$anon$1("QUESTION", 2);
  $t_Lsculpter_TokenType$__JMP = new $c_Lsculpter_TokenType$$anon$1("JMP", 3);
  $t_Lsculpter_TokenType$__CMP = new $c_Lsculpter_TokenType$$anon$1("CMP", 4);
  $t_Lsculpter_TokenType$__PUSH = new $c_Lsculpter_TokenType$$anon$1("PUSH", 5);
  $t_Lsculpter_TokenType$__POP = new $c_Lsculpter_TokenType$$anon$1("POP", 6);
  $t_Lsculpter_TokenType$__DUP = new $c_Lsculpter_TokenType$$anon$1("DUP", 7);
  $t_Lsculpter_TokenType$__MOV = new $c_Lsculpter_TokenType$$anon$1("MOV", 8);
  $t_Lsculpter_TokenType$__ADD = new $c_Lsculpter_TokenType$$anon$1("ADD", 9);
  $t_Lsculpter_TokenType$__SUB = new $c_Lsculpter_TokenType$$anon$1("SUB", 10);
  $t_Lsculpter_TokenType$__MUL = new $c_Lsculpter_TokenType$$anon$1("MUL", 11);
  $t_Lsculpter_TokenType$__DIV = new $c_Lsculpter_TokenType$$anon$1("DIV", 12);
  $t_Lsculpter_TokenType$__MOD = new $c_Lsculpter_TokenType$$anon$1("MOD", 13);
  $t_Lsculpter_TokenType$__NEG = new $c_Lsculpter_TokenType$$anon$1("NEG", 14);
  $t_Lsculpter_TokenType$__NUMBER = new $c_Lsculpter_TokenType$$anon$1("NUMBER", 15);
  $t_Lsculpter_TokenType$__STACK = new $c_Lsculpter_TokenType$$anon$1("STACK", 16);
  $t_Lsculpter_TokenType$__NIL = new $c_Lsculpter_TokenType$$anon$1("NIL", 17);
  $t_Lsculpter_TokenType$__EOF = new $c_Lsculpter_TokenType$$anon$1("EOF", 18);
  $s_Lsculpter_TokenType$__NUM_NEG__Lsculpter_TokenType();
  $s_Lsculpter_TokenType$__ENTER__Lsculpter_TokenType();
  $s_Lsculpter_TokenType$__QUESTION__Lsculpter_TokenType();
  $s_Lsculpter_TokenType$__JMP__Lsculpter_TokenType();
  $s_Lsculpter_TokenType$__CMP__Lsculpter_TokenType();
  $s_Lsculpter_TokenType$__PUSH__Lsculpter_TokenType();
  $s_Lsculpter_TokenType$__POP__Lsculpter_TokenType();
  $s_Lsculpter_TokenType$__DUP__Lsculpter_TokenType();
  $s_Lsculpter_TokenType$__MOV__Lsculpter_TokenType();
  $s_Lsculpter_TokenType$__ADD__Lsculpter_TokenType();
  $s_Lsculpter_TokenType$__SUB__Lsculpter_TokenType();
  $s_Lsculpter_TokenType$__MUL__Lsculpter_TokenType();
  $s_Lsculpter_TokenType$__DIV__Lsculpter_TokenType();
  $s_Lsculpter_TokenType$__MOD__Lsculpter_TokenType();
  $s_Lsculpter_TokenType$__NEG__Lsculpter_TokenType();
  $s_Lsculpter_TokenType$__NUMBER__Lsculpter_TokenType();
  $s_Lsculpter_TokenType$__STACK__Lsculpter_TokenType();
  $s_Lsculpter_TokenType$__NIL__Lsculpter_TokenType();
  $s_Lsculpter_TokenType$__EOF__Lsculpter_TokenType();
}
$p = $c_Lsculpter_TokenType$.prototype = new $h_O();
$p.constructor = $c_Lsculpter_TokenType$;
/** @constructor */
function $h_Lsculpter_TokenType$() {
}
$h_Lsculpter_TokenType$.prototype = $p;
var $d_Lsculpter_TokenType$ = new $TypeData().i($c_Lsculpter_TokenType$, "sculpter.TokenType$", ({
  e7: 1,
  b1: 1,
  ds: 1
}));
var $n_Lsculpter_TokenType$;
function $m_Lsculpter_TokenType$() {
  if ((!$n_Lsculpter_TokenType$)) {
    $n_Lsculpter_TokenType$ = new $c_Lsculpter_TokenType$();
  }
  return $n_Lsculpter_TokenType$;
}
/** @constructor */
function $c_Ljava_io_OutputStream() {
}
$p = $c_Ljava_io_OutputStream.prototype = new $h_O();
$p.constructor = $c_Ljava_io_OutputStream;
/** @constructor */
function $h_Ljava_io_OutputStream() {
}
$h_Ljava_io_OutputStream.prototype = $p;
function $f_jl_Boolean__equals__O__Z($thiz, that) {
  return ($thiz === that);
}
function $f_jl_Boolean__hashCode__I($thiz) {
  return ($thiz ? 1231 : 1237);
}
function $f_jl_Boolean__toString__T($thiz) {
  return ("" + $thiz);
}
var $d_jl_Boolean = new $TypeData().i(0, "java.lang.Boolean", ({
  bg: 1,
  a: 1,
  L: 1,
  F: 1
}), ((x) => ((typeof x) === "boolean")));
function $f_jl_Character__hashCode__I($thiz) {
  return $thiz;
}
function $f_jl_Character__equals__O__Z($thiz, that) {
  return ((that instanceof $Char) && ($thiz === that.c));
}
function $f_jl_Character__toString__T($thiz) {
  return ("" + $cToS($thiz));
}
function $isArrayOf_jl_Character(obj, depth) {
  return (!(!(((obj && obj.$classData) && (obj.$classData.D === depth)) && obj.$classData.B.n.ay)));
}
var $d_jl_Character = new $TypeData().i(0, "java.lang.Character", ({
  ay: 1,
  a: 1,
  L: 1,
  F: 1
}), ((x) => (x instanceof $Char)));
function $ct_jl_RuntimeException__T__($thiz, s) {
  $ct_jl_Throwable__T__jl_Throwable__Z__Z__($thiz, s, null, true, true);
  return $thiz;
}
class $c_jl_RuntimeException extends $c_jl_Exception {
}
function $isArrayOf_jl_RuntimeException(obj, depth) {
  return (!(!(((obj && obj.$classData) && (obj.$classData.D === depth)) && obj.$classData.B.n.q)));
}
var $d_jl_RuntimeException = new $TypeData().i($c_jl_RuntimeException, "java.lang.RuntimeException", ({
  q: 1,
  t: 1,
  r: 1,
  a: 1
}));
function $ct_jl_StringBuilder__($thiz) {
  $thiz.o = "";
  return $thiz;
}
function $ct_jl_StringBuilder__T__($thiz, str) {
  $ct_jl_StringBuilder__($thiz);
  $thiz.o = str;
  return $thiz;
}
/** @constructor */
function $c_jl_StringBuilder() {
  this.o = null;
}
$p = $c_jl_StringBuilder.prototype = new $h_O();
$p.constructor = $c_jl_StringBuilder;
/** @constructor */
function $h_jl_StringBuilder() {
}
$h_jl_StringBuilder.prototype = $p;
$p.gU = (function(str) {
  var str$1 = $m_jl_String$().hP(str, 0, str.a.length);
  this.o = (("" + this.o) + str$1);
  return this;
});
$p.A = (function() {
  return this.o;
});
$p.p = (function() {
  return this.o.length;
});
$p.g6 = (function(index) {
  return this.o.charCodeAt(index);
});
var $d_jl_StringBuilder = new $TypeData().i($c_jl_StringBuilder, "java.lang.StringBuilder", ({
  bz: 1,
  ad: 1,
  aw: 1,
  a: 1
}));
/** @constructor */
function $c_s_$eq$colon$eq() {
}
$p = $c_s_$eq$colon$eq.prototype = new $h_s_$less$colon$less();
$p.constructor = $c_s_$eq$colon$eq;
/** @constructor */
function $h_s_$eq$colon$eq() {
}
$h_s_$eq$colon$eq.prototype = $p;
/** @constructor */
function $c_sc_AbstractIterator() {
}
$p = $c_sc_AbstractIterator.prototype = new $h_O();
$p.constructor = $c_sc_AbstractIterator;
/** @constructor */
function $h_sc_AbstractIterator() {
}
$h_sc_AbstractIterator.prototype = $p;
$p.r = (function() {
  return (-1);
});
$p.c9 = (function(dest, start, n) {
  return $f_sc_IterableOnceOps__copyToArray__O__I__I__I(this, dest, start, n);
});
$p.dV = (function(b, start, sep, end) {
  return $f_sc_IterableOnceOps__addString__scm_StringBuilder__T__T__T__scm_StringBuilder(this, b, start, sep, end);
});
$p.k = (function() {
  return this;
});
$p.l = (function() {
  return (!this.m());
});
$p.f7 = (function(xs) {
  return $f_sc_Iterator__concat__F0__sc_Iterator(this, xs);
});
$p.cL = (function(n) {
  return this.e8(n, (-1));
});
$p.e8 = (function(from, until) {
  return $f_sc_Iterator__sliceIterator__I__I__sc_Iterator(this, from, until);
});
$p.A = (function() {
  return "<iterator>";
});
/** @constructor */
function $c_sc_Map$() {
  this.eN = null;
  this.fC = null;
  this.fD = null;
  $ct_sc_MapFactory$Delegate__sc_MapFactory__(this, $m_sci_Map$());
  $n_sc_Map$ = this;
  this.fC = $ct_O__(new $c_O());
  this.fD = new $c_sr_AbstractFunction0_$$Lambda$07eded5776954a9c145e92c329afd52873ad179c((() => this.fC));
}
$p = $c_sc_Map$.prototype = new $h_sc_MapFactory$Delegate();
$p.constructor = $c_sc_Map$;
/** @constructor */
function $h_sc_Map$() {
}
$h_sc_Map$.prototype = $p;
var $d_sc_Map$ = new $TypeData().i($c_sc_Map$, "scala.collection.Map$", ({
  ca: 1,
  cb: 1,
  a: 1,
  ag: 1
}));
var $n_sc_Map$;
function $m_sc_Map$() {
  if ((!$n_sc_Map$)) {
    $n_sc_Map$ = new $c_sc_Map$();
  }
  return $n_sc_Map$;
}
function $ct_sc_SeqFactory$Delegate__sc_SeqFactory__($thiz, delegate) {
  $thiz.d3 = delegate;
  return $thiz;
}
/** @constructor */
function $c_sc_SeqFactory$Delegate() {
  this.d3 = null;
}
$p = $c_sc_SeqFactory$Delegate.prototype = new $h_O();
$p.constructor = $c_sc_SeqFactory$Delegate;
/** @constructor */
function $h_sc_SeqFactory$Delegate() {
}
$h_sc_SeqFactory$Delegate.prototype = $p;
$p.ez = (function(it) {
  return this.d3.aq(it);
});
$p.ba = (function() {
  return this.d3.ba();
});
$p.aq = (function(source) {
  return this.ez(source);
});
function $f_sc_SeqOps__isEmpty__Z($thiz) {
  return ($thiz.bw(0) === 0);
}
function $f_sc_SeqOps__sameElements__sc_IterableOnce__Z($thiz, that) {
  var thisKnownSize = $thiz.r();
  if ((thisKnownSize !== (-1))) {
    var thatKnownSize = that.r();
    if ((thatKnownSize !== (-1))) {
      if ((thisKnownSize !== thatKnownSize)) {
        return false;
      }
      if ((thisKnownSize === 0)) {
        return true;
      }
    }
  }
  return $f_sc_Iterator__sameElements__sc_IterableOnce__Z($thiz.k(), that);
}
function $f_sc_StrictOptimizedIterableOps__map__F1__O($thiz, f) {
  var b = $thiz.bv().ba();
  var it = $thiz.k();
  while (it.m()) {
    b.b8(f.f(it.g()));
  }
  return b.bj();
}
/** @constructor */
function $c_sci_Iterable$() {
  this.ea = null;
  $ct_sc_IterableFactory$Delegate__sc_IterableFactory__(this, $m_sci_List$());
}
$p = $c_sci_Iterable$.prototype = new $h_sc_IterableFactory$Delegate();
$p.constructor = $c_sci_Iterable$;
/** @constructor */
function $h_sci_Iterable$() {
}
$h_sci_Iterable$.prototype = $p;
$p.hp = (function(it) {
  return ($is_sci_Iterable(it) ? it : $c_sc_IterableFactory$Delegate.prototype.aq.call(this, it));
});
$p.aq = (function(it) {
  return this.hp(it);
});
var $d_sci_Iterable$ = new $TypeData().i($c_sci_Iterable$, "scala.collection.immutable.Iterable$", ({
  cp: 1,
  c2: 1,
  a: 1,
  x: 1
}));
var $n_sci_Iterable$;
function $m_sci_Iterable$() {
  if ((!$n_sci_Iterable$)) {
    $n_sci_Iterable$ = new $c_sci_Iterable$();
  }
  return $n_sci_Iterable$;
}
/** @constructor */
function $c_sci_LazyList$() {
  this.Q = null;
  $n_sci_LazyList$ = this;
  this.Q = $ct_sci_LazyList__O__(new $c_sci_LazyList(), $m_sci_LazyList$EmptyMarker$());
}
$p = $c_sci_LazyList$.prototype = new $h_O();
$p.constructor = $c_sci_LazyList$;
/** @constructor */
function $h_sci_LazyList$() {
}
$h_sci_LazyList$.prototype = $p;
$p.ia = (function(ll, n) {
  return $ct_sci_LazyList__O__(new $c_sci_LazyList(), new $c_sr_AbstractFunction0_$$Lambda$07eded5776954a9c145e92c329afd52873ad179c(((restRef, iRef) => (() => {
    var rest = restRef.el;
    var i = iRef.ek;
    while (((i > 0) && (!($p_sci_LazyList__evaluated__sci_LazyList(rest) === $m_sci_LazyList$().Q)))) {
      rest = rest.aN();
      restRef.el = rest;
      i = ((i - 1) | 0);
      iRef.ek = i;
    }
    return rest;
  }))(new $c_sr_ObjectRef(ll), new $c_sr_IntRef(n))));
});
$p.gg = (function(coll) {
  return ((coll instanceof $c_sci_LazyList) ? coll : ((coll.r() === 0) ? this.Q : $ct_sci_LazyList__O__(new $c_sci_LazyList(), new $c_sr_AbstractFunction0_$$Lambda$07eded5776954a9c145e92c329afd52873ad179c((() => this.gu(coll.k()))))));
});
$p.gv = (function(it, suffix) {
  return (it.m() ? $ct_sci_LazyList__O__sci_LazyList__(new $c_sci_LazyList(), it.g(), $ct_sci_LazyList__O__(new $c_sci_LazyList(), new $c_sr_AbstractFunction0_$$Lambda$07eded5776954a9c145e92c329afd52873ad179c((() => this.gv(it, suffix))))) : suffix.aw());
});
$p.gu = (function(it) {
  return (it.m() ? $ct_sci_LazyList__O__sci_LazyList__(new $c_sci_LazyList(), it.g(), $ct_sci_LazyList__O__(new $c_sci_LazyList(), new $c_sr_AbstractFunction0_$$Lambda$07eded5776954a9c145e92c329afd52873ad179c((() => this.gu(it))))) : this.Q);
});
$p.ba = (function() {
  return new $c_sci_LazyList$LazyBuilder();
});
$p.aq = (function(source) {
  return this.gg(source);
});
var $d_sci_LazyList$ = new $TypeData().i($c_sci_LazyList$, "scala.collection.immutable.LazyList$", ({
  cq: 1,
  a: 1,
  x: 1,
  G: 1
}));
var $n_sci_LazyList$;
function $m_sci_LazyList$() {
  if ((!$n_sci_LazyList$)) {
    $n_sci_LazyList$ = new $c_sci_LazyList$();
  }
  return $n_sci_LazyList$;
}
/** @constructor */
function $c_scm_Builder$$anon$1(f$2, outer) {
  this.fO = null;
  this.dH = null;
  this.fO = f$2;
  if ((outer === null)) {
    throw $ct_jl_NullPointerException__(new $c_jl_NullPointerException());
  }
  this.dH = outer;
}
$p = $c_scm_Builder$$anon$1.prototype = new $h_O();
$p.constructor = $c_scm_Builder$$anon$1;
/** @constructor */
function $h_scm_Builder$$anon$1() {
}
$h_scm_Builder$$anon$1.prototype = $p;
$p.gR = (function(x) {
  this.dH.b8(x);
  return this;
});
$p.gJ = (function(xs) {
  this.dH.b7(xs);
  return this;
});
$p.bk = (function(size) {
  this.dH.bk(size);
});
$p.bj = (function() {
  return this.fO.f(this.dH.bj());
});
$p.b8 = (function(elem) {
  return this.gR(elem);
});
$p.b7 = (function(elems) {
  return this.gJ(elems);
});
var $d_scm_Builder$$anon$1 = new $TypeData().i($c_scm_Builder$$anon$1, "scala.collection.mutable.Builder$$anon$1", ({
  de: 1,
  B: 1,
  C: 1,
  E: 1
}));
function $ct_scm_GrowableBuilder__scm_Growable__($thiz, elems) {
  $thiz.de = elems;
  return $thiz;
}
/** @constructor */
function $c_scm_GrowableBuilder() {
  this.de = null;
}
$p = $c_scm_GrowableBuilder.prototype = new $h_O();
$p.constructor = $c_scm_GrowableBuilder;
/** @constructor */
function $h_scm_GrowableBuilder() {
}
$h_scm_GrowableBuilder.prototype = $p;
$p.bk = (function(size) {
});
$p.gS = (function(elem) {
  this.de.b8(elem);
  return this;
});
$p.gK = (function(xs) {
  this.de.b7(xs);
  return this;
});
$p.bj = (function() {
  return this.de;
});
$p.b8 = (function(elem) {
  return this.gS(elem);
});
$p.b7 = (function(elems) {
  return this.gK(elems);
});
var $d_scm_GrowableBuilder = new $TypeData().i($c_scm_GrowableBuilder, "scala.collection.mutable.GrowableBuilder", ({
  aX: 1,
  B: 1,
  C: 1,
  E: 1
}));
function $f_sr_EnumValue__productElement__I__O($thiz, n) {
  throw $ct_jl_IndexOutOfBoundsException__T__(new $c_jl_IndexOutOfBoundsException(), ("" + n));
}
function $ct_Ljava_io_FilterOutputStream__Ljava_io_OutputStream__($thiz, out) {
  return $thiz;
}
/** @constructor */
function $c_Ljava_io_FilterOutputStream() {
}
$p = $c_Ljava_io_FilterOutputStream.prototype = new $h_Ljava_io_OutputStream();
$p.constructor = $c_Ljava_io_FilterOutputStream;
/** @constructor */
function $h_Ljava_io_FilterOutputStream() {
}
$h_Ljava_io_FilterOutputStream.prototype = $p;
class $c_jl_ArithmeticException extends $c_jl_RuntimeException {
  constructor(s) {
    super();
    $ct_jl_Throwable__T__jl_Throwable__Z__Z__(this, s, null, true, true);
  }
}
var $d_jl_ArithmeticException = new $TypeData().i($c_jl_ArithmeticException, "java.lang.ArithmeticException", ({
  be: 1,
  q: 1,
  t: 1,
  r: 1,
  a: 1
}));
function $f_jl_Byte__equals__O__Z($thiz, that) {
  return Object.is($thiz, that);
}
function $f_jl_Byte__hashCode__I($thiz) {
  return $thiz;
}
function $f_jl_Byte__toString__T($thiz) {
  return ("" + $thiz);
}
var $d_jl_Byte = new $TypeData().i(0, "java.lang.Byte", ({
  bh: 1,
  S: 1,
  a: 1,
  L: 1,
  F: 1
}), ((x) => $isByte(x)));
function $isArrayOf_jl_ClassCastException(obj, depth) {
  return (!(!(((obj && obj.$classData) && (obj.$classData.D === depth)) && obj.$classData.B.n.bk)));
}
function $ct_jl_IllegalArgumentException__T__($thiz, s) {
  $ct_jl_Throwable__T__jl_Throwable__Z__Z__($thiz, s, null, true, true);
  return $thiz;
}
function $ct_jl_IllegalArgumentException__($thiz) {
  $ct_jl_Throwable__T__jl_Throwable__Z__Z__($thiz, null, null, true, true);
  return $thiz;
}
class $c_jl_IllegalArgumentException extends $c_jl_RuntimeException {
}
var $d_jl_IllegalArgumentException = new $TypeData().i($c_jl_IllegalArgumentException, "java.lang.IllegalArgumentException", ({
  aA: 1,
  q: 1,
  t: 1,
  r: 1,
  a: 1
}));
class $c_jl_IllegalStateException extends $c_jl_RuntimeException {
  constructor(s) {
    super();
    $ct_jl_Throwable__T__jl_Throwable__Z__Z__(this, s, null, true, true);
  }
}
var $d_jl_IllegalStateException = new $TypeData().i($c_jl_IllegalStateException, "java.lang.IllegalStateException", ({
  bn: 1,
  q: 1,
  t: 1,
  r: 1,
  a: 1
}));
function $ct_jl_IndexOutOfBoundsException__T__($thiz, s) {
  $ct_jl_Throwable__T__jl_Throwable__Z__Z__($thiz, s, null, true, true);
  return $thiz;
}
class $c_jl_IndexOutOfBoundsException extends $c_jl_RuntimeException {
}
var $d_jl_IndexOutOfBoundsException = new $TypeData().i($c_jl_IndexOutOfBoundsException, "java.lang.IndexOutOfBoundsException", ({
  aB: 1,
  q: 1,
  t: 1,
  r: 1,
  a: 1
}));
/** @constructor */
function $c_jl_JSConsoleBasedPrintStream$DummyOutputStream() {
}
$p = $c_jl_JSConsoleBasedPrintStream$DummyOutputStream.prototype = new $h_Ljava_io_OutputStream();
$p.constructor = $c_jl_JSConsoleBasedPrintStream$DummyOutputStream;
/** @constructor */
function $h_jl_JSConsoleBasedPrintStream$DummyOutputStream() {
}
$h_jl_JSConsoleBasedPrintStream$DummyOutputStream.prototype = $p;
var $d_jl_JSConsoleBasedPrintStream$DummyOutputStream = new $TypeData().i($c_jl_JSConsoleBasedPrintStream$DummyOutputStream, "java.lang.JSConsoleBasedPrintStream$DummyOutputStream", ({
  br: 1,
  av: 1,
  at: 1,
  ax: 1,
  au: 1
}));
function $ct_jl_NullPointerException__T__($thiz, s) {
  $ct_jl_Throwable__T__jl_Throwable__Z__Z__($thiz, s, null, true, true);
  return $thiz;
}
function $ct_jl_NullPointerException__($thiz) {
  $ct_jl_Throwable__T__jl_Throwable__Z__Z__($thiz, null, null, true, true);
  return $thiz;
}
class $c_jl_NullPointerException extends $c_jl_RuntimeException {
}
var $d_jl_NullPointerException = new $TypeData().i($c_jl_NullPointerException, "java.lang.NullPointerException", ({
  bt: 1,
  q: 1,
  t: 1,
  r: 1,
  a: 1
}));
function $isArrayOf_jl_SecurityException(obj, depth) {
  return (!(!(((obj && obj.$classData) && (obj.$classData.D === depth)) && obj.$classData.B.n.bv)));
}
function $f_jl_Short__equals__O__Z($thiz, that) {
  return Object.is($thiz, that);
}
function $f_jl_Short__hashCode__I($thiz) {
  return $thiz;
}
function $f_jl_Short__toString__T($thiz) {
  return ("" + $thiz);
}
var $d_jl_Short = new $TypeData().i(0, "java.lang.Short", ({
  bw: 1,
  S: 1,
  a: 1,
  L: 1,
  F: 1
}), ((x) => $isShort(x)));
function $ct_jl_UnsupportedOperationException__($thiz) {
  $ct_jl_Throwable__T__jl_Throwable__Z__Z__($thiz, null, null, true, true);
  return $thiz;
}
function $ct_jl_UnsupportedOperationException__T__($thiz, s) {
  $ct_jl_Throwable__T__jl_Throwable__Z__Z__($thiz, s, null, true, true);
  return $thiz;
}
class $c_jl_UnsupportedOperationException extends $c_jl_RuntimeException {
}
var $d_jl_UnsupportedOperationException = new $TypeData().i($c_jl_UnsupportedOperationException, "java.lang.UnsupportedOperationException", ({
  bC: 1,
  q: 1,
  t: 1,
  r: 1,
  a: 1
}));
class $c_ju_ConcurrentModificationException extends $c_jl_RuntimeException {
  constructor(s) {
    super();
    $ct_jl_Throwable__T__jl_Throwable__Z__Z__(this, s, null, true, true);
  }
}
var $d_ju_ConcurrentModificationException = new $TypeData().i($c_ju_ConcurrentModificationException, "java.util.ConcurrentModificationException", ({
  bH: 1,
  q: 1,
  t: 1,
  r: 1,
  a: 1
}));
class $c_ju_NoSuchElementException extends $c_jl_RuntimeException {
  constructor(s) {
    super();
    $ct_jl_Throwable__T__jl_Throwable__Z__Z__(this, s, null, true, true);
  }
}
var $d_ju_NoSuchElementException = new $TypeData().i($c_ju_NoSuchElementException, "java.util.NoSuchElementException", ({
  bI: 1,
  q: 1,
  t: 1,
  r: 1,
  a: 1
}));
/** @constructor */
function $c_s_$less$colon$less$$anon$1() {
}
$p = $c_s_$less$colon$less$$anon$1.prototype = new $h_s_$eq$colon$eq();
$p.constructor = $c_s_$less$colon$less$$anon$1;
/** @constructor */
function $h_s_$less$colon$less$$anon$1() {
}
$h_s_$less$colon$less$$anon$1.prototype = $p;
$p.f = (function(x) {
  return x;
});
$p.A = (function() {
  return "generalized constraint";
});
var $d_s_$less$colon$less$$anon$1 = new $TypeData().i($c_s_$less$colon$less$$anon$1, "scala.$less$colon$less$$anon$1", ({
  bN: 1,
  bK: 1,
  bL: 1,
  i: 1,
  a: 1
}));
function $p_s_MatchError__objString__T($thiz) {
  if ((!$thiz.fw)) {
    if (($thiz.e9 === null)) {
      var $x_1 = "null";
    } else {
      var this$1 = $thiz.e9;
      var cls = $objectGetClass(this$1);
      var ofClass = ((cls === null) ? "of a JS class" : ("of class " + cls.be.N));
      try {
        var $x_1 = ((($thiz.e9 + " (") + ofClass) + ")");
      } catch (e) {
        var $x_1 = ("an instance " + ofClass);
      }
    }
    $thiz.fv = $x_1;
    $thiz.fw = true;
  }
  return $thiz.fv;
}
class $c_s_MatchError extends $c_jl_RuntimeException {
  constructor(obj) {
    super();
    this.e9 = null;
    this.fv = null;
    this.fw = false;
    this.e9 = obj;
    $ct_jl_Throwable__T__jl_Throwable__Z__Z__(this, null, null, true, true);
  }
  e2() {
    return $p_s_MatchError__objString__T(this);
  }
}
var $d_s_MatchError = new $TypeData().i($c_s_MatchError, "scala.MatchError", ({
  bU: 1,
  q: 1,
  t: 1,
  r: 1,
  a: 1
}));
/** @constructor */
function $c_s_Option() {
}
$p = $c_s_Option.prototype = new $h_O();
$p.constructor = $c_s_Option;
/** @constructor */
function $h_s_Option() {
}
$h_s_Option.prototype = $p;
$p.bK = (function() {
  return new $c_s_Product$$anon$1(this);
});
$p.l = (function() {
  return (this === $m_s_None$());
});
$p.r = (function() {
  return ((!this.l()) | 0);
});
$p.ex = (function(ev) {
  return (this.l() ? $m_s_None$() : this.e0());
});
$p.k = (function() {
  return (this.l() ? $m_sc_Iterator$().ab : new $c_sc_Iterator$$anon$20(this.e0()));
});
/** @constructor */
function $c_s_Product$$anon$1(outer) {
  this.dv = 0;
  this.fy = 0;
  this.fx = null;
  if ((outer === null)) {
    throw $ct_jl_NullPointerException__(new $c_jl_NullPointerException());
  }
  this.fx = outer;
  this.dv = 0;
  this.fy = outer.bb();
}
$p = $c_s_Product$$anon$1.prototype = new $h_sc_AbstractIterator();
$p.constructor = $c_s_Product$$anon$1;
/** @constructor */
function $h_s_Product$$anon$1() {
}
$h_s_Product$$anon$1.prototype = $p;
$p.m = (function() {
  return (this.dv < this.fy);
});
$p.g = (function() {
  var result = this.fx.bc(this.dv);
  this.dv = ((1 + this.dv) | 0);
  return result;
});
var $d_s_Product$$anon$1 = new $TypeData().i($c_s_Product$$anon$1, "scala.Product$$anon$1", ({
  bX: 1,
  m: 1,
  b: 1,
  c: 1,
  n: 1
}));
/** @constructor */
function $c_T2(_1, _2) {
  this.az = null;
  this.aA = null;
  this.az = _1;
  this.aA = _2;
}
$p = $c_T2.prototype = new $h_O();
$p.constructor = $c_T2;
/** @constructor */
function $h_T2() {
}
$h_T2.prototype = $p;
$p.bb = (function() {
  return 2;
});
$p.bc = (function(n) {
  return $f_s_Product2__productElement__I__O(this, n);
});
$p.A = (function() {
  return (((("(" + this.az) + ",") + this.aA) + ")");
});
$p.bd = (function() {
  return "Tuple2";
});
$p.bK = (function() {
  return new $c_sr_ScalaRunTime$$anon$1(this);
});
$p.S = (function() {
  return $m_s_util_hashing_MurmurHash3$().d1(this, (-116390334), true);
});
$p.P = (function(x$1) {
  return ((this === x$1) || ((x$1 instanceof $c_T2) && ($m_sr_BoxesRunTime$().h(this.az, x$1.az) && $m_sr_BoxesRunTime$().h(this.aA, x$1.aA))));
});
function $isArrayOf_T2(obj, depth) {
  return (!(!(((obj && obj.$classData) && (obj.$classData.D === depth)) && obj.$classData.B.n.aG)));
}
var $d_T2 = new $TypeData().i($c_T2, "scala.Tuple2", ({
  aG: 1,
  bY: 1,
  v: 1,
  d: 1,
  a: 1
}));
function $f_sc_IndexedSeqOps__drop__I__O($thiz, n) {
  return $thiz.dm($ct_sc_IndexedSeqView$Drop__sc_IndexedSeqOps__I__(new $c_sc_IndexedSeqView$Drop(), $thiz, n));
}
function $f_sc_IndexedSeqOps__head__O($thiz) {
  if ((!$thiz.l())) {
    return $thiz.x(0);
  } else {
    throw new $c_ju_NoSuchElementException(("head of empty " + ($is_sc_IndexedSeq($thiz) ? $thiz.c7() : $thiz.A())));
  }
}
function $f_sc_Iterable__toString__T($thiz) {
  return $f_sc_IterableOnceOps__mkString__T__T__T__T($thiz, ($thiz.c7() + "("), ", ", ")");
}
function $is_sc_Iterable(obj) {
  return (!(!((obj && obj.$classData) && obj.$classData.n.e)));
}
function $isArrayOf_sc_Iterable(obj, depth) {
  return (!(!(((obj && obj.$classData) && (obj.$classData.D === depth)) && obj.$classData.B.n.e)));
}
/** @constructor */
function $c_sc_Iterator$$anon$19() {
}
$p = $c_sc_Iterator$$anon$19.prototype = new $h_sc_AbstractIterator();
$p.constructor = $c_sc_Iterator$$anon$19;
/** @constructor */
function $h_sc_Iterator$$anon$19() {
}
$h_sc_Iterator$$anon$19.prototype = $p;
$p.m = (function() {
  return false;
});
$p.hQ = (function() {
  throw new $c_ju_NoSuchElementException("next on empty iterator");
});
$p.r = (function() {
  return 0;
});
$p.g = (function() {
  this.hQ();
});
$p.e8 = (function(from, until) {
  return this;
});
var $d_sc_Iterator$$anon$19 = new $TypeData().i($c_sc_Iterator$$anon$19, "scala.collection.Iterator$$anon$19", ({
  c4: 1,
  m: 1,
  b: 1,
  c: 1,
  n: 1
}));
/** @constructor */
function $c_sc_Iterator$$anon$20(a$2) {
  this.fz = null;
  this.dw = false;
  this.fz = a$2;
  this.dw = false;
}
$p = $c_sc_Iterator$$anon$20.prototype = new $h_sc_AbstractIterator();
$p.constructor = $c_sc_Iterator$$anon$20;
/** @constructor */
function $h_sc_Iterator$$anon$20() {
}
$h_sc_Iterator$$anon$20.prototype = $p;
$p.m = (function() {
  return (!this.dw);
});
$p.g = (function() {
  if (this.dw) {
    return $m_sc_Iterator$().ab.g();
  } else {
    this.dw = true;
    return this.fz;
  }
});
$p.e8 = (function(from, until) {
  return (((this.dw || (from > 0)) || (until === 0)) ? $m_sc_Iterator$().ab : this);
});
var $d_sc_Iterator$$anon$20 = new $TypeData().i($c_sc_Iterator$$anon$20, "scala.collection.Iterator$$anon$20", ({
  c5: 1,
  m: 1,
  b: 1,
  c: 1,
  n: 1
}));
/** @constructor */
function $c_sc_Iterator$$anon$9(f$9, outer) {
  this.fA = null;
  this.eb = null;
  this.fA = f$9;
  if ((outer === null)) {
    throw $ct_jl_NullPointerException__(new $c_jl_NullPointerException());
  }
  this.eb = outer;
}
$p = $c_sc_Iterator$$anon$9.prototype = new $h_sc_AbstractIterator();
$p.constructor = $c_sc_Iterator$$anon$9;
/** @constructor */
function $h_sc_Iterator$$anon$9() {
}
$h_sc_Iterator$$anon$9.prototype = $p;
$p.r = (function() {
  return this.eb.r();
});
$p.m = (function() {
  return this.eb.m();
});
$p.g = (function() {
  return this.fA.f(this.eb.g());
});
var $d_sc_Iterator$$anon$9 = new $TypeData().i($c_sc_Iterator$$anon$9, "scala.collection.Iterator$$anon$9", ({
  c7: 1,
  m: 1,
  b: 1,
  c: 1,
  n: 1
}));
function $p_sc_Iterator$ConcatIterator__merge$1__V($thiz) {
  while (true) {
    if (($thiz.bf instanceof $c_sc_Iterator$ConcatIterator)) {
      var c = $thiz.bf;
      $thiz.bf = c.bf;
      $thiz.ct = c.ct;
      if ((c.bz !== null)) {
        if (($thiz.by === null)) {
          $thiz.by = c.by;
        }
        var x$proxy10 = c.by;
        if ((x$proxy10 === null)) {
          $m_sr_Scala3RunTime$().cr();
        }
        x$proxy10.dx = $thiz.bz;
        $thiz.bz = c.bz;
      }
    } else {
      return (void 0);
    }
  }
}
function $p_sc_Iterator$ConcatIterator__advance$1__Z($thiz) {
  while (true) {
    if (($thiz.bz === null)) {
      $thiz.bf = null;
      $thiz.by = null;
      return false;
    } else {
      $thiz.bf = $thiz.bz.hv();
      if (($thiz.by === $thiz.bz)) {
        var x$proxy12 = $thiz.by;
        if ((x$proxy12 === null)) {
          $m_sr_Scala3RunTime$().cr();
        }
        $thiz.by = x$proxy12.dx;
      }
      $thiz.bz = $thiz.bz.dx;
      $p_sc_Iterator$ConcatIterator__merge$1__V($thiz);
      if ($thiz.ct) {
        return true;
      } else {
        if ((!(($thiz.bf !== null) && $thiz.bf.m()))) {
          continue;
        }
        $thiz.ct = true;
        return true;
      }
    }
  }
}
/** @constructor */
function $c_sc_Iterator$ConcatIterator(from) {
  this.bf = null;
  this.bz = null;
  this.by = null;
  this.ct = false;
  this.bf = from;
  this.bz = null;
  this.by = null;
  this.ct = false;
}
$p = $c_sc_Iterator$ConcatIterator.prototype = new $h_sc_AbstractIterator();
$p.constructor = $c_sc_Iterator$ConcatIterator;
/** @constructor */
function $h_sc_Iterator$ConcatIterator() {
}
$h_sc_Iterator$ConcatIterator.prototype = $p;
$p.m = (function() {
  if (this.ct) {
    return true;
  } else if ((this.bf !== null)) {
    if (this.bf.m()) {
      this.ct = true;
      return true;
    } else {
      return $p_sc_Iterator$ConcatIterator__advance$1__Z(this);
    }
  } else {
    return false;
  }
});
$p.g = (function() {
  if (this.m()) {
    this.ct = false;
    var x$proxy13 = this.bf;
    if ((x$proxy13 === null)) {
      $m_sr_Scala3RunTime$().cr();
    }
    return x$proxy13.g();
  } else {
    return $m_sc_Iterator$().ab.g();
  }
});
$p.f7 = (function(that) {
  var c = new $c_sc_Iterator$ConcatIteratorCell(that, null);
  if ((this.bz === null)) {
    this.bz = c;
    this.by = c;
  } else {
    var x$proxy14 = this.by;
    if ((x$proxy14 === null)) {
      $m_sr_Scala3RunTime$().cr();
    }
    x$proxy14.dx = c;
    this.by = c;
  }
  if ((this.bf === null)) {
    this.bf = $m_sc_Iterator$().ab;
  }
  return this;
});
function $isArrayOf_sc_Iterator$ConcatIterator(obj, depth) {
  return (!(!(((obj && obj.$classData) && (obj.$classData.D === depth)) && obj.$classData.B.n.aJ)));
}
var $d_sc_Iterator$ConcatIterator = new $TypeData().i($c_sc_Iterator$ConcatIterator, "scala.collection.Iterator$ConcatIterator", ({
  aJ: 1,
  m: 1,
  b: 1,
  c: 1,
  n: 1
}));
function $p_sc_Iterator$SliceIterator__skip__V($thiz) {
  while (($thiz.ce > 0)) {
    if ($thiz.cu.m()) {
      $thiz.cu.g();
      $thiz.ce = (($thiz.ce - 1) | 0);
    } else {
      $thiz.ce = 0;
    }
  }
}
function $p_sc_Iterator$SliceIterator__adjustedBound$1__I__I($thiz, lo$1) {
  if (($thiz.bm < 0)) {
    return (-1);
  } else {
    var that = (($thiz.bm - lo$1) | 0);
    return ((that < 0) ? 0 : that);
  }
}
/** @constructor */
function $c_sc_Iterator$SliceIterator(underlying, start, limit) {
  this.cu = null;
  this.bm = 0;
  this.ce = 0;
  this.cu = underlying;
  this.bm = limit;
  this.ce = start;
}
$p = $c_sc_Iterator$SliceIterator.prototype = new $h_sc_AbstractIterator();
$p.constructor = $c_sc_Iterator$SliceIterator;
/** @constructor */
function $h_sc_Iterator$SliceIterator() {
}
$h_sc_Iterator$SliceIterator.prototype = $p;
$p.r = (function() {
  var size = this.cu.r();
  if ((size < 0)) {
    return (-1);
  } else {
    var that = ((size - this.ce) | 0);
    var dropSize = ((that < 0) ? 0 : that);
    if ((this.bm < 0)) {
      return dropSize;
    } else {
      var x = this.bm;
      return ((x < dropSize) ? x : dropSize);
    }
  }
});
$p.m = (function() {
  $p_sc_Iterator$SliceIterator__skip__V(this);
  return ((this.bm !== 0) && this.cu.m());
});
$p.g = (function() {
  $p_sc_Iterator$SliceIterator__skip__V(this);
  if ((this.bm > 0)) {
    this.bm = ((this.bm - 1) | 0);
    return this.cu.g();
  } else {
    return ((this.bm < 0) ? this.cu.g() : $m_sc_Iterator$().ab.g());
  }
});
$p.e8 = (function(from, until) {
  var lo = ((from > 0) ? from : 0);
  if ((until < 0)) {
    var rest = $p_sc_Iterator$SliceIterator__adjustedBound$1__I__I(this, lo);
  } else if ((until <= lo)) {
    var rest = 0;
  } else if ((this.bm < 0)) {
    var rest = ((until - lo) | 0);
  } else {
    var x = $p_sc_Iterator$SliceIterator__adjustedBound$1__I__I(this, lo);
    var that = ((until - lo) | 0);
    var rest = ((x < that) ? x : that);
  }
  var sum = ((this.ce + lo) | 0);
  if ((rest === 0)) {
    return $m_sc_Iterator$().ab;
  } else if ((sum < 0)) {
    this.ce = 2147483647;
    this.bm = 0;
    return $f_sc_Iterator__concat__F0__sc_Iterator(this, new $c_sr_AbstractFunction0_$$Lambda$07eded5776954a9c145e92c329afd52873ad179c((() => new $c_sc_Iterator$SliceIterator(this.cu, ((sum - 2147483647) | 0), rest))));
  } else {
    this.ce = sum;
    this.bm = rest;
    return this;
  }
});
var $d_sc_Iterator$SliceIterator = new $TypeData().i($c_sc_Iterator$SliceIterator, "scala.collection.Iterator$SliceIterator", ({
  c9: 1,
  m: 1,
  b: 1,
  c: 1,
  n: 1
}));
function $f_sc_LinearSeqOps__headOption__s_Option($thiz) {
  return ($thiz.l() ? $m_s_None$() : new $c_s_Some($thiz.w()));
}
function $f_sc_LinearSeqOps__length__I($thiz) {
  var these = $thiz;
  var len = 0;
  while ((!these.l())) {
    len = ((1 + len) | 0);
    these = these.F();
  }
  return len;
}
function $f_sc_LinearSeqOps__lengthCompare__I__I($thiz, len) {
  return ((len < 0) ? 1 : $p_sc_LinearSeqOps__loop$1__I__I__sc_LinearSeq__I($thiz, len, 0, $thiz));
}
function $f_sc_LinearSeqOps__apply__I__O($thiz, n) {
  if ((n < 0)) {
    throw $ct_jl_IndexOutOfBoundsException__T__(new $c_jl_IndexOutOfBoundsException(), ("" + n));
  }
  var skipped = $thiz.aZ(n);
  if (skipped.l()) {
    throw $ct_jl_IndexOutOfBoundsException__T__(new $c_jl_IndexOutOfBoundsException(), ("" + n));
  }
  return skipped.w();
}
function $f_sc_LinearSeqOps__sameElements__sc_IterableOnce__Z($thiz, that) {
  return ($is_sc_LinearSeq(that) ? $p_sc_LinearSeqOps__linearSeqEq$1__sc_LinearSeq__sc_LinearSeq__Z($thiz, $thiz, that) : $f_sc_SeqOps__sameElements__sc_IterableOnce__Z($thiz, that));
}
function $p_sc_LinearSeqOps__loop$1__I__I__sc_LinearSeq__I($thiz, len$1, i, xs) {
  var xs$tailLocal1 = xs;
  var i$tailLocal1 = i;
  while (true) {
    if ((i$tailLocal1 === len$1)) {
      return ((!xs$tailLocal1.l()) | 0);
    } else {
      if ((!xs$tailLocal1.l())) {
        var i$tailLocal1$tmp1 = ((1 + i$tailLocal1) | 0);
        var xs$tailLocal1$tmp1 = xs$tailLocal1.F();
        i$tailLocal1 = i$tailLocal1$tmp1;
        xs$tailLocal1 = xs$tailLocal1$tmp1;
        continue;
      }
      return (-1);
    }
  }
}
function $p_sc_LinearSeqOps__linearSeqEq$1__sc_LinearSeq__sc_LinearSeq__Z($thiz, a, b) {
  var b$tailLocal1 = b;
  var a$tailLocal1 = a;
  while (true) {
    if ((a$tailLocal1 === b$tailLocal1)) {
      return true;
    } else {
      if ((((!a$tailLocal1.l()) && (!b$tailLocal1.l())) && $m_sr_BoxesRunTime$().h(a$tailLocal1.w(), b$tailLocal1.w()))) {
        var a$tailLocal1$tmp1 = a$tailLocal1.F();
        var b$tailLocal1$tmp1 = b$tailLocal1.F();
        a$tailLocal1 = a$tailLocal1$tmp1;
        b$tailLocal1 = b$tailLocal1$tmp1;
        continue;
      }
      return (a$tailLocal1.l() && b$tailLocal1.l());
    }
  }
}
/** @constructor */
function $c_sc_StrictOptimizedLinearSeqOps$$anon$1(outer) {
  this.dy = null;
  if ((outer === null)) {
    throw $ct_jl_NullPointerException__(new $c_jl_NullPointerException());
  }
  this.dy = outer;
}
$p = $c_sc_StrictOptimizedLinearSeqOps$$anon$1.prototype = new $h_sc_AbstractIterator();
$p.constructor = $c_sc_StrictOptimizedLinearSeqOps$$anon$1;
/** @constructor */
function $h_sc_StrictOptimizedLinearSeqOps$$anon$1() {
}
$h_sc_StrictOptimizedLinearSeqOps$$anon$1.prototype = $p;
$p.m = (function() {
  return (!this.dy.l());
});
$p.g = (function() {
  var r = this.dy.w();
  this.dy = this.dy.F();
  return r;
});
var $d_sc_StrictOptimizedLinearSeqOps$$anon$1 = new $TypeData().i($c_sc_StrictOptimizedLinearSeqOps$$anon$1, "scala.collection.StrictOptimizedLinearSeqOps$$anon$1", ({
  cc: 1,
  m: 1,
  b: 1,
  c: 1,
  n: 1
}));
function $ct_sci_ChampBaseIterator__($thiz) {
  $thiz.bn = 0;
  $thiz.dA = 0;
  $thiz.bg = (-1);
  return $thiz;
}
function $p_sci_ChampBaseIterator__initNodes__V($thiz) {
  if (($thiz.cf === null)) {
    $thiz.cf = new $ac_I(($m_sci_Node$().dG << 1));
    $thiz.dB = new ($d_sci_Node.r().C)($m_sci_Node$().dG);
  }
}
function $ct_sci_ChampBaseIterator__sci_Node__($thiz, rootNode) {
  $ct_sci_ChampBaseIterator__($thiz);
  if (rootNode.ff()) {
    $p_sci_ChampBaseIterator__pushNode__sci_Node__V($thiz, rootNode);
  }
  if (rootNode.eB()) {
    $p_sci_ChampBaseIterator__setupPayloadNode__sci_Node__V($thiz, rootNode);
  }
  return $thiz;
}
function $p_sci_ChampBaseIterator__setupPayloadNode__sci_Node__V($thiz, node) {
  $thiz.cR = node;
  $thiz.bn = 0;
  $thiz.dA = node.fk();
}
function $p_sci_ChampBaseIterator__pushNode__sci_Node__V($thiz, node) {
  $p_sci_ChampBaseIterator__initNodes__V($thiz);
  $thiz.bg = ((1 + $thiz.bg) | 0);
  var cursorIndex = ($thiz.bg << 1);
  var lengthIndex = ((1 + ($thiz.bg << 1)) | 0);
  $thiz.dB.a[$thiz.bg] = node;
  $thiz.cf.a[cursorIndex] = 0;
  $thiz.cf.a[lengthIndex] = node.fj();
}
function $p_sci_ChampBaseIterator__popNode__V($thiz) {
  $thiz.bg = (($thiz.bg - 1) | 0);
}
function $p_sci_ChampBaseIterator__searchNextValueNode__Z($thiz) {
  while (($thiz.bg >= 0)) {
    var cursorIndex = ($thiz.bg << 1);
    var lengthIndex = ((1 + ($thiz.bg << 1)) | 0);
    var nodeCursor = $thiz.cf.a[cursorIndex];
    if ((nodeCursor < $thiz.cf.a[lengthIndex])) {
      var \u03b41$ = $thiz.cf;
      \u03b41$.a[cursorIndex] = ((1 + \u03b41$.a[cursorIndex]) | 0);
      var nextNode = $thiz.dB.a[$thiz.bg].fc(nodeCursor);
      if (nextNode.ff()) {
        $p_sci_ChampBaseIterator__pushNode__sci_Node__V($thiz, nextNode);
      }
      if (nextNode.eB()) {
        $p_sci_ChampBaseIterator__setupPayloadNode__sci_Node__V($thiz, nextNode);
        return true;
      }
    } else {
      $p_sci_ChampBaseIterator__popNode__V($thiz);
    }
  }
  return false;
}
/** @constructor */
function $c_sci_ChampBaseIterator() {
  this.bn = 0;
  this.dA = 0;
  this.cR = null;
  this.bg = 0;
  this.cf = null;
  this.dB = null;
}
$p = $c_sci_ChampBaseIterator.prototype = new $h_sc_AbstractIterator();
$p.constructor = $c_sci_ChampBaseIterator;
/** @constructor */
function $h_sci_ChampBaseIterator() {
}
$h_sci_ChampBaseIterator.prototype = $p;
$p.m = (function() {
  return ((this.bn < this.dA) || $p_sci_ChampBaseIterator__searchNextValueNode__Z(this));
});
function $ct_sci_ChampBaseReverseIterator__($thiz) {
  $thiz.cv = (-1);
  $thiz.bo = (-1);
  $thiz.dC = new $ac_I(((1 + $m_sci_Node$().dG) | 0));
  $thiz.dD = new ($d_sci_Node.r().C)(((1 + $m_sci_Node$().dG) | 0));
  return $thiz;
}
function $ct_sci_ChampBaseReverseIterator__sci_Node__($thiz, rootNode) {
  $ct_sci_ChampBaseReverseIterator__($thiz);
  $p_sci_ChampBaseReverseIterator__pushNode__sci_Node__V($thiz, rootNode);
  $p_sci_ChampBaseReverseIterator__searchNextValueNode__Z($thiz);
  return $thiz;
}
function $p_sci_ChampBaseReverseIterator__setupPayloadNode__sci_Node__V($thiz, node) {
  $thiz.ee = node;
  $thiz.cv = ((node.fk() - 1) | 0);
}
function $p_sci_ChampBaseReverseIterator__pushNode__sci_Node__V($thiz, node) {
  $thiz.bo = ((1 + $thiz.bo) | 0);
  $thiz.dD.a[$thiz.bo] = node;
  $thiz.dC.a[$thiz.bo] = ((node.fj() - 1) | 0);
}
function $p_sci_ChampBaseReverseIterator__popNode__V($thiz) {
  $thiz.bo = (($thiz.bo - 1) | 0);
}
function $p_sci_ChampBaseReverseIterator__searchNextValueNode__Z($thiz) {
  while (($thiz.bo >= 0)) {
    var nodeCursor = $thiz.dC.a[$thiz.bo];
    $thiz.dC.a[$thiz.bo] = ((nodeCursor - 1) | 0);
    if ((nodeCursor >= 0)) {
      $p_sci_ChampBaseReverseIterator__pushNode__sci_Node__V($thiz, $thiz.dD.a[$thiz.bo].fc(nodeCursor));
    } else {
      var currNode = $thiz.dD.a[$thiz.bo];
      $p_sci_ChampBaseReverseIterator__popNode__V($thiz);
      if (currNode.eB()) {
        $p_sci_ChampBaseReverseIterator__setupPayloadNode__sci_Node__V($thiz, currNode);
        return true;
      }
    }
  }
  return false;
}
/** @constructor */
function $c_sci_ChampBaseReverseIterator() {
  this.cv = 0;
  this.ee = null;
  this.bo = 0;
  this.dC = null;
  this.dD = null;
}
$p = $c_sci_ChampBaseReverseIterator.prototype = new $h_sc_AbstractIterator();
$p.constructor = $c_sci_ChampBaseReverseIterator;
/** @constructor */
function $h_sci_ChampBaseReverseIterator() {
}
$h_sci_ChampBaseReverseIterator.prototype = $p;
$p.m = (function() {
  return ((this.cv >= 0) || $p_sci_ChampBaseReverseIterator__searchNextValueNode__Z(this));
});
function $p_sci_HashMapBuilder__isAliased__Z($thiz) {
  return ($thiz.d6 !== null);
}
function $p_sci_HashMapBuilder__insertElement__AI__I__I__AI($thiz, as, ix, elem) {
  if ((ix < 0)) {
    throw $ct_jl_ArrayIndexOutOfBoundsException__(new $c_jl_ArrayIndexOutOfBoundsException());
  }
  if ((ix > as.a.length)) {
    throw $ct_jl_ArrayIndexOutOfBoundsException__(new $c_jl_ArrayIndexOutOfBoundsException());
  }
  var result = new $ac_I(((1 + as.a.length) | 0));
  as.j(0, result, 0, ix);
  result.a[ix] = elem;
  var destPos = ((1 + ix) | 0);
  var length = ((as.a.length - ix) | 0);
  as.j(ix, result, destPos, length);
  return result;
}
function $p_sci_HashMapBuilder__insertValue__sci_BitmapIndexedMapNode__I__O__I__I__O__V($thiz, bm, bitpos, key, originalHash, keyHash, value) {
  var dataIx = bm.cY(bitpos);
  var idx = (dataIx << 1);
  var src = bm.Z;
  var dst = new $ac_O(((2 + src.a.length) | 0));
  src.j(0, dst, 0, idx);
  dst.a[idx] = key;
  dst.a[((1 + idx) | 0)] = value;
  var destPos = ((2 + idx) | 0);
  var length = ((src.a.length - idx) | 0);
  src.j(idx, dst, destPos, length);
  var dstHashes = $p_sci_HashMapBuilder__insertElement__AI__I__I__AI($thiz, bm.aH, dataIx, originalHash);
  bm.D = (bm.D | bitpos);
  bm.Z = dst;
  bm.aH = dstHashes;
  bm.an = ((1 + bm.an) | 0);
  bm.aO = ((bm.aO + keyHash) | 0);
}
function $p_sci_HashMapBuilder__ensureUnaliased__V($thiz) {
  if ($p_sci_HashMapBuilder__isAliased__Z($thiz)) {
    $p_sci_HashMapBuilder__copyElems__V($thiz);
  }
  $thiz.d6 = null;
}
function $p_sci_HashMapBuilder__copyElems__V($thiz) {
  $thiz.c0 = $thiz.c0.g8();
}
/** @constructor */
function $c_sci_HashMapBuilder() {
  this.d6 = null;
  this.c0 = null;
  this.c0 = new $c_sci_BitmapIndexedMapNode(0, 0, $m_s_Array$EmptyArrays$().ft, $m_s_Array$EmptyArrays$().eL, 0, 0);
}
$p = $c_sci_HashMapBuilder.prototype = new $h_O();
$p.constructor = $c_sci_HashMapBuilder;
/** @constructor */
function $h_sci_HashMapBuilder() {
}
$h_sci_HashMapBuilder.prototype = $p;
$p.bk = (function(size) {
});
$p.dr = (function(mapNode, key, value, originalHash, keyHash, shift) {
  if ((mapNode instanceof $c_sci_BitmapIndexedMapNode)) {
    var mask = $m_sci_Node$().bV(keyHash, shift);
    var bitpos = $m_sci_Node$().bI(mask);
    if (((mapNode.D & bitpos) !== 0)) {
      var index = $m_sci_Node$().bi(mapNode.D, mask, bitpos);
      var key0 = mapNode.bt(index);
      var key0UnimprovedHash = mapNode.cM(index);
      if (((key0UnimprovedHash === originalHash) && $m_sr_BoxesRunTime$().h(key0, key))) {
        mapNode.Z.a[((1 + (index << 1)) | 0)] = value;
        return (void 0);
      } else {
        var value0 = mapNode.bu(index);
        var key0Hash = $m_sc_Hashing$().b9(key0UnimprovedHash);
        var subNodeNew = mapNode.fi(key0, value0, key0UnimprovedHash, key0Hash, key, value, originalHash, keyHash, ((5 + shift) | 0));
        mapNode.hN(bitpos, key0Hash, subNodeNew);
        return (void 0);
      }
    } else if (((mapNode.H & bitpos) !== 0)) {
      var index$2 = $m_sci_Node$().bi(mapNode.H, mask, bitpos);
      var subNode = mapNode.bT(index$2);
      var beforeSize = subNode.ay();
      var beforeHash = subNode.c6();
      this.dr(subNode, key, value, originalHash, keyHash, ((5 + shift) | 0));
      mapNode.an = ((mapNode.an + ((subNode.ay() - beforeSize) | 0)) | 0);
      mapNode.aO = ((mapNode.aO + ((subNode.c6() - beforeHash) | 0)) | 0);
      return (void 0);
    } else {
      $p_sci_HashMapBuilder__insertValue__sci_BitmapIndexedMapNode__I__O__I__I__O__V(this, mapNode, bitpos, key, originalHash, keyHash, value);
      return (void 0);
    }
  }
  if ((mapNode instanceof $c_sci_HashCollisionMapNode)) {
    var index$3 = mapNode.dp(key);
    if ((index$3 < 0)) {
      mapNode.a3 = mapNode.a3.cI(new $c_T2(key, value));
      return (void 0);
    } else {
      mapNode.a3 = mapNode.a3.cO(index$3, new $c_T2(key, value));
      return (void 0);
    }
  }
  throw new $c_s_MatchError(mapNode);
});
$p.fm = (function() {
  if ((this.c0.an === 0)) {
    return $m_sci_HashMap$().eP;
  } else if ((this.d6 !== null)) {
    return this.d6;
  } else {
    this.d6 = new $c_sci_HashMap(this.c0);
    return this.d6;
  }
});
$p.g2 = (function(elem) {
  $p_sci_HashMapBuilder__ensureUnaliased__V(this);
  var h = $m_sr_Statics$().aj(elem.az);
  var im = $m_sc_Hashing$().b9(h);
  this.dr(this.c0, elem.az, elem.aA, h, im, 0);
  return this;
});
$p.cX = (function(key, value) {
  $p_sci_HashMapBuilder__ensureUnaliased__V(this);
  var originalHash = $m_sr_Statics$().aj(key);
  this.dr(this.c0, key, value, originalHash, $m_sc_Hashing$().b9(originalHash), 0);
  return this;
});
$p.f3 = (function(xs) {
  $p_sci_HashMapBuilder__ensureUnaliased__V(this);
  if ((xs instanceof $c_sci_HashMap)) {
    new $c_sci_HashMapBuilder$$anon$1(xs, this);
  } else if (false) {
    var iter = xs.iy();
    while (iter.m()) {
      var next = iter.g();
      var originalHash = xs.io(next.ht());
      var hash = $m_sc_Hashing$().b9(originalHash);
      this.dr(this.c0, next.hE(), next.iq(), originalHash, hash, 0);
    }
  } else if (false) {
    var iter$2 = xs.iw();
    while (iter$2.m()) {
      var next$2 = iter$2.g();
      var originalHash$2 = xs.io(next$2.ht());
      var hash$2 = $m_sc_Hashing$().b9(originalHash$2);
      this.dr(this.c0, next$2.hE(), next$2.iq(), originalHash$2, hash$2, 0);
    }
  } else if ($is_sci_Map(xs)) {
    xs.d0(new $c_sr_AbstractFunction2_$$Lambda$b4228bd32034ae3b2f0c5fc896319aa4b79b55f8(((key$2, value$2) => this.cX(key$2, value$2))));
  } else {
    var it = xs.k();
    while (it.m()) {
      this.g2(it.g());
    }
  }
  return this;
});
$p.bj = (function() {
  return this.fm();
});
$p.b8 = (function(elem) {
  return this.g2(elem);
});
$p.b7 = (function(elems) {
  return this.f3(elems);
});
var $d_sci_HashMapBuilder = new $TypeData().i($c_sci_HashMapBuilder, "scala.collection.immutable.HashMapBuilder", ({
  cm: 1,
  B: 1,
  C: 1,
  E: 1,
  a0: 1
}));
/** @constructor */
function $c_sci_LazyList$LazyBuilder() {
  this.d7 = null;
  this.fH = null;
  this.h4();
}
$p = $c_sci_LazyList$LazyBuilder.prototype = new $h_O();
$p.constructor = $c_sci_LazyList$LazyBuilder;
/** @constructor */
function $h_sci_LazyList$LazyBuilder() {
}
$h_sci_LazyList$LazyBuilder.prototype = $p;
$p.bk = (function(size) {
});
$p.h4 = (function() {
  var deferred = new $c_sci_LazyList$LazyBuilder$DeferredState();
  this.fH = ($m_sci_LazyList$(), $ct_sci_LazyList__O__(new $c_sci_LazyList(), new $c_sr_AbstractFunction0_$$Lambda$07eded5776954a9c145e92c329afd52873ad179c((() => deferred.fa()))));
  this.d7 = deferred;
});
$p.i8 = (function() {
  this.d7.fh(new $c_sr_AbstractFunction0_$$Lambda$07eded5776954a9c145e92c329afd52873ad179c((() => $m_sci_LazyList$().Q)));
  return this.fH;
});
$p.gP = (function(elem) {
  var deferred = new $c_sci_LazyList$LazyBuilder$DeferredState();
  this.d7.fh(new $c_sr_AbstractFunction0_$$Lambda$07eded5776954a9c145e92c329afd52873ad179c((() => {
    $m_sci_LazyList$();
    return $ct_sci_LazyList__O__sci_LazyList__(new $c_sci_LazyList(), elem, ($m_sci_LazyList$(), $ct_sci_LazyList__O__(new $c_sci_LazyList(), new $c_sr_AbstractFunction0_$$Lambda$07eded5776954a9c145e92c329afd52873ad179c((() => deferred.fa())))));
  })));
  this.d7 = deferred;
  return this;
});
$p.gI = (function(xs) {
  if ((xs.r() !== 0)) {
    var deferred = new $c_sci_LazyList$LazyBuilder$DeferredState();
    this.d7.fh(new $c_sr_AbstractFunction0_$$Lambda$07eded5776954a9c145e92c329afd52873ad179c((() => $m_sci_LazyList$().gv(xs.k(), new $c_sr_AbstractFunction0_$$Lambda$07eded5776954a9c145e92c329afd52873ad179c((() => deferred.fa()))))));
    this.d7 = deferred;
  }
  return this;
});
$p.bj = (function() {
  return this.i8();
});
$p.b8 = (function(elem) {
  return this.gP(elem);
});
$p.b7 = (function(elems) {
  return this.gI(elems);
});
var $d_sci_LazyList$LazyBuilder = new $TypeData().i($c_sci_LazyList$LazyBuilder, "scala.collection.immutable.LazyList$LazyBuilder", ({
  cs: 1,
  B: 1,
  C: 1,
  E: 1,
  a0: 1
}));
/** @constructor */
function $c_sci_LazyList$LazyIterator(lazyList) {
  this.d8 = null;
  this.d8 = lazyList;
}
$p = $c_sci_LazyList$LazyIterator.prototype = new $h_sc_AbstractIterator();
$p.constructor = $c_sci_LazyList$LazyIterator;
/** @constructor */
function $h_sci_LazyList$LazyIterator() {
}
$h_sci_LazyList$LazyIterator.prototype = $p;
$p.m = (function() {
  return (!($p_sci_LazyList__evaluated__sci_LazyList(this.d8) === $m_sci_LazyList$().Q));
});
$p.g = (function() {
  if (($p_sci_LazyList__evaluated__sci_LazyList(this.d8) === $m_sci_LazyList$().Q)) {
    return $m_sc_Iterator$().ab.g();
  } else {
    var res = this.d8.w();
    this.d8 = this.d8.aN();
    return res;
  }
});
var $d_sci_LazyList$LazyIterator = new $TypeData().i($c_sci_LazyList$LazyIterator, "scala.collection.immutable.LazyList$LazyIterator", ({
  cu: 1,
  m: 1,
  b: 1,
  c: 1,
  n: 1
}));
/** @constructor */
function $c_sci_List$() {
  $n_sci_List$ = this;
  var _1 = $m_sci_Nil$();
  $m_sci_Nil$();
}
$p = $c_sci_List$.prototype = new $h_O();
$p.constructor = $c_sci_List$;
/** @constructor */
function $h_sci_List$() {
}
$h_sci_List$.prototype = $p;
$p.ba = (function() {
  return new $c_scm_ListBuffer();
});
$p.aq = (function(source) {
  return $m_sci_Nil$().hZ(source);
});
var $d_sci_List$ = new $TypeData().i($c_sci_List$, "scala.collection.immutable.List$", ({
  cx: 1,
  a: 1,
  x: 1,
  G: 1,
  a2: 1
}));
var $n_sci_List$;
function $m_sci_List$() {
  if ((!$n_sci_List$)) {
    $n_sci_List$ = new $c_sci_List$();
  }
  return $n_sci_List$;
}
function $ct_sci_Map$Map2$Map2Iterator__sci_Map$Map2__($thiz, outer) {
  if ((outer === null)) {
    throw $ct_jl_NullPointerException__(new $c_jl_NullPointerException());
  }
  $thiz.d9 = outer;
  $thiz.cy = 0;
  return $thiz;
}
/** @constructor */
function $c_sci_Map$Map2$Map2Iterator() {
  this.cy = 0;
  this.d9 = null;
}
$p = $c_sci_Map$Map2$Map2Iterator.prototype = new $h_sc_AbstractIterator();
$p.constructor = $c_sci_Map$Map2$Map2Iterator;
/** @constructor */
function $h_sci_Map$Map2$Map2Iterator() {
}
$h_sci_Map$Map2$Map2Iterator.prototype = $p;
$p.m = (function() {
  return (this.cy < 2);
});
$p.g = (function() {
  matchResult5$1: {
    var result;
    var x23 = this.cy;
    if ((x23 === 0)) {
      var result = new $c_T2(this.d9.bA, this.d9.cg);
      break matchResult5$1;
    }
    if ((x23 === 1)) {
      var result = new $c_T2(this.d9.bB, this.d9.ch);
      break matchResult5$1;
    }
    var result = $m_sc_Iterator$().ab.g();
  }
  this.cy = ((1 + this.cy) | 0);
  return result;
});
$p.cL = (function(n) {
  this.cy = ((this.cy + n) | 0);
  return this;
});
function $ct_sci_Map$Map3$Map3Iterator__sci_Map$Map3__($thiz, outer) {
  if ((outer === null)) {
    throw $ct_jl_NullPointerException__(new $c_jl_NullPointerException());
  }
  $thiz.cz = outer;
  $thiz.cA = 0;
  return $thiz;
}
/** @constructor */
function $c_sci_Map$Map3$Map3Iterator() {
  this.cA = 0;
  this.cz = null;
}
$p = $c_sci_Map$Map3$Map3Iterator.prototype = new $h_sc_AbstractIterator();
$p.constructor = $c_sci_Map$Map3$Map3Iterator;
/** @constructor */
function $h_sci_Map$Map3$Map3Iterator() {
}
$h_sci_Map$Map3$Map3Iterator.prototype = $p;
$p.m = (function() {
  return (this.cA < 3);
});
$p.g = (function() {
  var result;
  switch (this.cA) {
    case 0: {
      var result = new $c_T2(this.cz.bp, this.cz.c2);
      break;
    }
    case 1: {
      var result = new $c_T2(this.cz.bq, this.cz.c3);
      break;
    }
    case 2: {
      var result = new $c_T2(this.cz.br, this.cz.c4);
      break;
    }
    default: {
      var result = $m_sc_Iterator$().ab.g();
    }
  }
  this.cA = ((1 + this.cA) | 0);
  return result;
});
$p.cL = (function(n) {
  this.cA = ((this.cA + n) | 0);
  return this;
});
function $ct_sci_Map$Map4$Map4Iterator__sci_Map$Map4__($thiz, outer) {
  if ((outer === null)) {
    throw $ct_jl_NullPointerException__(new $c_jl_NullPointerException());
  }
  $thiz.c5 = outer;
  $thiz.cB = 0;
  return $thiz;
}
/** @constructor */
function $c_sci_Map$Map4$Map4Iterator() {
  this.cB = 0;
  this.c5 = null;
}
$p = $c_sci_Map$Map4$Map4Iterator.prototype = new $h_sc_AbstractIterator();
$p.constructor = $c_sci_Map$Map4$Map4Iterator;
/** @constructor */
function $h_sci_Map$Map4$Map4Iterator() {
}
$h_sci_Map$Map4$Map4Iterator.prototype = $p;
$p.m = (function() {
  return (this.cB < 4);
});
$p.g = (function() {
  var result;
  switch (this.cB) {
    case 0: {
      var result = new $c_T2(this.c5.b0, this.c5.bC);
      break;
    }
    case 1: {
      var result = new $c_T2(this.c5.b1, this.c5.bD);
      break;
    }
    case 2: {
      var result = new $c_T2(this.c5.b2, this.c5.bE);
      break;
    }
    case 3: {
      var result = new $c_T2(this.c5.b3, this.c5.bF);
      break;
    }
    default: {
      var result = $m_sc_Iterator$().ab.g();
    }
  }
  this.cB = ((1 + this.cB) | 0);
  return result;
});
$p.cL = (function(n) {
  this.cB = ((this.cB + n) | 0);
  return this;
});
/** @constructor */
function $c_sci_MapBuilderImpl() {
  this.ci = null;
  this.dE = false;
  this.cS = null;
  this.ci = $m_sci_Map$EmptyMap$();
  this.dE = false;
}
$p = $c_sci_MapBuilderImpl.prototype = new $h_O();
$p.constructor = $c_sci_MapBuilderImpl;
/** @constructor */
function $h_sci_MapBuilderImpl() {
}
$h_sci_MapBuilderImpl.prototype = $p;
$p.bk = (function(size) {
});
$p.gt = (function() {
  return (this.dE ? this.cS.fm() : this.ci);
});
$p.gN = (function(key, value) {
  if (this.dE) {
    this.cS.cX(key, value);
  } else if ((this.ci.ay() < 4)) {
    this.ci = this.ci.aa(key, value);
  } else if (this.ci.cK(key)) {
    this.ci = this.ci.aa(key, value);
  } else {
    this.dE = true;
    if ((this.cS === null)) {
      this.cS = new $c_sci_HashMapBuilder();
    }
    this.ci.h3(this.cS);
    this.cS.cX(key, value);
  }
  return this;
});
$p.fZ = (function(xs) {
  return (this.dE ? (this.cS.f3(xs), this) : $f_scm_Growable__addAll__sc_IterableOnce__scm_Growable(this, xs));
});
$p.bj = (function() {
  return this.gt();
});
$p.b8 = (function(elem) {
  return this.gN(elem.az, elem.aA);
});
$p.b7 = (function(elems) {
  return this.fZ(elems);
});
var $d_sci_MapBuilderImpl = new $TypeData().i($c_sci_MapBuilderImpl, "scala.collection.immutable.MapBuilderImpl", ({
  cI: 1,
  B: 1,
  C: 1,
  E: 1,
  a0: 1
}));
/** @constructor */
function $c_sci_Seq$() {
  this.d3 = null;
  $ct_sc_SeqFactory$Delegate__sc_SeqFactory__(this, $m_sci_List$());
}
$p = $c_sci_Seq$.prototype = new $h_sc_SeqFactory$Delegate();
$p.constructor = $c_sci_Seq$;
/** @constructor */
function $h_sci_Seq$() {
}
$h_sci_Seq$.prototype = $p;
$p.fb = (function(it) {
  return ($is_sci_Seq(it) ? it : $c_sc_SeqFactory$Delegate.prototype.ez.call(this, it));
});
$p.ez = (function(it) {
  return this.fb(it);
});
$p.aq = (function(source) {
  return this.fb(source);
});
var $d_sci_Seq$ = new $TypeData().i($c_sci_Seq$, "scala.collection.immutable.Seq$", ({
  cP: 1,
  ah: 1,
  a: 1,
  x: 1,
  G: 1
}));
var $n_sci_Seq$;
function $m_sci_Seq$() {
  if ((!$n_sci_Seq$)) {
    $n_sci_Seq$ = new $c_sci_Seq$();
  }
  return $n_sci_Seq$;
}
/** @constructor */
function $c_sci_Vector$() {
  this.fL = 0;
  this.fM = null;
  $n_sci_Vector$ = this;
  try {
    $m_sc_StringOps$();
    var $x_1 = $m_jl_Integer$().gp($m_jl_System$SystemProperties$().fe("scala.collection.immutable.Vector.defaultApplyPreferredMaxLength", "250"), 10, 214748364);
  } catch (e) {
    if (false) {
      var $x_1 = 250;
    } else {
      var $x_1;
      throw e;
    }
  }
  this.fL = $x_1;
  this.fM = new $c_sci_NewVectorIterator($m_sci_Vector0$(), 0, 0);
}
$p = $c_sci_Vector$.prototype = new $h_O();
$p.constructor = $c_sci_Vector$;
/** @constructor */
function $h_sci_Vector$() {
}
$h_sci_Vector$.prototype = $p;
$p.gi = (function(it) {
  if ((it instanceof $c_sci_Vector)) {
    return it;
  } else {
    var knownSize = it.r();
    if ((knownSize === 0)) {
      return $m_sci_Vector0$();
    } else if (((((knownSize - 1) | 0) >>> 0) <= 31)) {
      matchResult3: {
        var $x_1;
        if (false) {
          var x = it.iv().i9();
          if (((x !== null) && (x === $d_O.l()))) {
            var $x_1 = it.is;
            break matchResult3;
          }
        }
        if ($is_sci_Iterable(it)) {
          var a1 = new $ac_O(knownSize);
          it.c9(a1, 0, 2147483647);
          var $x_1 = a1;
          break matchResult3;
        }
        var a1$2 = new $ac_O(knownSize);
        it.k().c9(a1$2, 0, 2147483647);
        var $x_1 = a1$2;
      }
      return new $c_sci_Vector1($x_1);
    } else {
      return new $c_sci_VectorBuilder().g0(it).cc();
    }
  }
});
$p.aq = (function(source) {
  return this.gi(source);
});
$p.ba = (function() {
  return new $c_sci_VectorBuilder();
});
var $d_sci_Vector$ = new $TypeData().i($c_sci_Vector$, "scala.collection.immutable.Vector$", ({
  cW: 1,
  a: 1,
  x: 1,
  G: 1,
  a2: 1
}));
var $n_sci_Vector$;
function $m_sci_Vector$() {
  if ((!$n_sci_Vector$)) {
    $n_sci_Vector$ = new $c_sci_Vector$();
  }
  return $n_sci_Vector$;
}
function $p_sci_VectorBuilder__leftAlignPrefix__V($thiz) {
  var a = null;
  var aParent = null;
  if (($thiz.C >= 6)) {
    a = $thiz.av;
    var i = (($thiz.z >>> 25) | 0);
    if ((i > 0)) {
      var src = a;
      var dest = a;
      var length = ((64 - i) | 0);
      src.j(i, dest, 0, length);
    }
    var num = $thiz.z;
    var t = (((num >> 24) >>> 7) | 0);
    var newOffset = (((33554431 & ((num + t) | 0)) - t) | 0);
    $thiz.q = (($thiz.q - (($thiz.z - newOffset) | 0)) | 0);
    $thiz.z = newOffset;
    if (((($thiz.q >>> 25) | 0) === 0)) {
      $thiz.C = 5;
    }
    aParent = a;
    a = a.a[0];
  }
  if (($thiz.C >= 5)) {
    if ((a === null)) {
      a = $thiz.R;
    }
    var i$2 = (31 & (($thiz.z >>> 20) | 0));
    if (($thiz.C === 5)) {
      if ((i$2 > 0)) {
        var src$1 = a;
        var dest$1 = a;
        var length$1 = ((32 - i$2) | 0);
        src$1.j(i$2, dest$1, 0, length$1);
      }
      $thiz.R = a;
      var num$1 = $thiz.z;
      var t$1 = (((num$1 >> 19) >>> 12) | 0);
      var newOffset$1 = (((1048575 & ((num$1 + t$1) | 0)) - t$1) | 0);
      $thiz.q = (($thiz.q - (($thiz.z - newOffset$1) | 0)) | 0);
      $thiz.z = newOffset$1;
      if (((($thiz.q >>> 20) | 0) === 0)) {
        $thiz.C = 4;
      }
    } else {
      if ((i$2 > 0)) {
        a = $m_ju_Arrays$().t(a, i$2, 32);
      }
      aParent.a[0] = a;
    }
    aParent = a;
    a = a.a[0];
  }
  if (($thiz.C >= 4)) {
    if ((a === null)) {
      a = $thiz.G;
    }
    var i$3 = (31 & (($thiz.z >>> 15) | 0));
    if (($thiz.C === 4)) {
      if ((i$3 > 0)) {
        var src$2 = a;
        var dest$2 = a;
        var length$2 = ((32 - i$3) | 0);
        src$2.j(i$3, dest$2, 0, length$2);
      }
      $thiz.G = a;
      var num$2 = $thiz.z;
      var t$2 = (((num$2 >> 14) >>> 17) | 0);
      var newOffset$2 = (((32767 & ((num$2 + t$2) | 0)) - t$2) | 0);
      $thiz.q = (($thiz.q - (($thiz.z - newOffset$2) | 0)) | 0);
      $thiz.z = newOffset$2;
      if (((($thiz.q >>> 15) | 0) === 0)) {
        $thiz.C = 3;
      }
    } else {
      if ((i$3 > 0)) {
        a = $m_ju_Arrays$().t(a, i$3, 32);
      }
      aParent.a[0] = a;
    }
    aParent = a;
    a = a.a[0];
  }
  if (($thiz.C >= 3)) {
    if ((a === null)) {
      a = $thiz.B;
    }
    var i$4 = (31 & (($thiz.z >>> 10) | 0));
    if (($thiz.C === 3)) {
      if ((i$4 > 0)) {
        var src$3 = a;
        var dest$3 = a;
        var length$3 = ((32 - i$4) | 0);
        src$3.j(i$4, dest$3, 0, length$3);
      }
      $thiz.B = a;
      var num$3 = $thiz.z;
      var t$3 = (((num$3 >> 9) >>> 22) | 0);
      var newOffset$3 = (((1023 & ((num$3 + t$3) | 0)) - t$3) | 0);
      $thiz.q = (($thiz.q - (($thiz.z - newOffset$3) | 0)) | 0);
      $thiz.z = newOffset$3;
      if (((($thiz.q >>> 10) | 0) === 0)) {
        $thiz.C = 2;
      }
    } else {
      if ((i$4 > 0)) {
        a = $m_ju_Arrays$().t(a, i$4, 32);
      }
      aParent.a[0] = a;
    }
    aParent = a;
    a = a.a[0];
  }
  if (($thiz.C >= 2)) {
    if ((a === null)) {
      a = $thiz.u;
    }
    var i$5 = (31 & (($thiz.z >>> 5) | 0));
    if (($thiz.C === 2)) {
      if ((i$5 > 0)) {
        var src$4 = a;
        var dest$4 = a;
        var length$4 = ((32 - i$5) | 0);
        src$4.j(i$5, dest$4, 0, length$4);
      }
      $thiz.u = a;
      var num$4 = $thiz.z;
      var t$4 = (((num$4 >> 4) >>> 27) | 0);
      var newOffset$4 = (((31 & ((num$4 + t$4) | 0)) - t$4) | 0);
      $thiz.q = (($thiz.q - (($thiz.z - newOffset$4) | 0)) | 0);
      $thiz.z = newOffset$4;
      if (((($thiz.q >>> 5) | 0) === 0)) {
        $thiz.C = 1;
      }
    } else {
      if ((i$5 > 0)) {
        a = $m_ju_Arrays$().t(a, i$5, 32);
      }
      aParent.a[0] = a;
    }
    aParent = a;
    a = a.a[0];
  }
  if (($thiz.C >= 1)) {
    if ((a === null)) {
      a = $thiz.I;
    }
    var i$6 = (31 & $thiz.z);
    if (($thiz.C === 1)) {
      if ((i$6 > 0)) {
        var src$5 = a;
        var dest$5 = a;
        var length$5 = ((32 - i$6) | 0);
        src$5.j(i$6, dest$5, 0, length$5);
      }
      $thiz.I = a;
      $thiz.v = (($thiz.v - $thiz.z) | 0);
      $thiz.z = 0;
    } else {
      if ((i$6 > 0)) {
        a = $m_ju_Arrays$().t(a, i$6, 32);
      }
      aParent.a[0] = a;
    }
  }
  $thiz.eg = false;
}
function $p_sci_VectorBuilder__addArr1__AO__V($thiz, data) {
  var dl = data.a.length;
  if ((dl > 0)) {
    if (($thiz.v === 32)) {
      $p_sci_VectorBuilder__advance__V($thiz);
    }
    var a = ((32 - $thiz.v) | 0);
    var copy1 = ((a < dl) ? a : dl);
    var copy2 = ((dl - copy1) | 0);
    var dest = $thiz.I;
    var destPos = $thiz.v;
    data.j(0, dest, destPos, copy1);
    $thiz.v = (($thiz.v + copy1) | 0);
    if ((copy2 > 0)) {
      $p_sci_VectorBuilder__advance__V($thiz);
      var dest$1 = $thiz.I;
      data.j(copy1, dest$1, 0, copy2);
      $thiz.v = (($thiz.v + copy2) | 0);
    }
  }
}
function $p_sci_VectorBuilder__addArrN__AO__I__V($thiz, slice, dim) {
  if ((slice.a.length === 0)) {
    return (void 0);
  }
  if (($thiz.v === 32)) {
    $p_sci_VectorBuilder__advance__V($thiz);
  }
  var sl = slice.a.length;
  switch (dim) {
    case 2: {
      var a = (31 & ((((1024 - $thiz.q) | 0) >>> 5) | 0));
      var copy1 = ((a < sl) ? a : sl);
      var copy2 = ((sl - copy1) | 0);
      var destPos = (31 & (($thiz.q >>> 5) | 0));
      var dest = $thiz.u;
      slice.j(0, dest, destPos, copy1);
      $p_sci_VectorBuilder__advanceN__I__V($thiz, (copy1 << 5));
      if ((copy2 > 0)) {
        var dest$1 = $thiz.u;
        slice.j(copy1, dest$1, 0, copy2);
        $p_sci_VectorBuilder__advanceN__I__V($thiz, (copy2 << 5));
      }
      break;
    }
    case 3: {
      var num = $thiz.q;
      var t = (((num >> 9) >>> 22) | 0);
      if (((((1023 & ((num + t) | 0)) - t) | 0) !== 0)) {
        var f = ((e$3) => {
          $p_sci_VectorBuilder__addArrN__AO__I__V($thiz, e$3, 2);
        });
        var len = slice.a.length;
        var i = 0;
        if ((slice !== null)) {
          while ((i < len)) {
            var x0 = slice.a[i];
            f(x0);
            i = ((1 + i) | 0);
          }
        } else if ((slice instanceof $ac_I)) {
          while ((i < len)) {
            var x0$1 = slice.a[i];
            f(x0$1);
            i = ((1 + i) | 0);
          }
        } else if ((slice instanceof $ac_D)) {
          while ((i < len)) {
            var x0$2 = slice.a[i];
            f(x0$2);
            i = ((1 + i) | 0);
          }
        } else if ((slice instanceof $ac_J)) {
          while ((i < len)) {
            var $x_1 = slice.a;
            var $x_2 = (i << 1);
            var x0$3_$_lo = $x_1[$x_2];
            var x0$3_$_hi = $x_1[(($x_2 + 1) | 0)];
            f($bL(x0$3_$_lo, x0$3_$_hi));
            i = ((1 + i) | 0);
          }
        } else if ((slice instanceof $ac_F)) {
          while ((i < len)) {
            var x0$4 = slice.a[i];
            f(x0$4);
            i = ((1 + i) | 0);
          }
        } else if ((slice instanceof $ac_C)) {
          while ((i < len)) {
            var x0$5 = slice.a[i];
            f($bC(x0$5));
            i = ((1 + i) | 0);
          }
        } else if ((slice instanceof $ac_B)) {
          while ((i < len)) {
            var x0$6 = slice.a[i];
            f(x0$6);
            i = ((1 + i) | 0);
          }
        } else if ((slice instanceof $ac_S)) {
          while ((i < len)) {
            var x0$7 = slice.a[i];
            f(x0$7);
            i = ((1 + i) | 0);
          }
        } else if ((slice instanceof $ac_Z)) {
          while ((i < len)) {
            var x0$8 = slice.a[i];
            f(x0$8);
            i = ((1 + i) | 0);
          }
        } else {
          throw new $c_s_MatchError(slice);
        }
        return (void 0);
      }
      var a$1 = (31 & ((((32768 - $thiz.q) | 0) >>> 10) | 0));
      var copy1$2 = ((a$1 < sl) ? a$1 : sl);
      var copy2$2 = ((sl - copy1$2) | 0);
      var destPos$2 = (31 & (($thiz.q >>> 10) | 0));
      var dest$2 = $thiz.B;
      slice.j(0, dest$2, destPos$2, copy1$2);
      $p_sci_VectorBuilder__advanceN__I__V($thiz, (copy1$2 << 10));
      if ((copy2$2 > 0)) {
        var dest$3 = $thiz.B;
        slice.j(copy1$2, dest$3, 0, copy2$2);
        $p_sci_VectorBuilder__advanceN__I__V($thiz, (copy2$2 << 10));
      }
      break;
    }
    case 4: {
      var num$1 = $thiz.q;
      var t$1 = (((num$1 >> 14) >>> 17) | 0);
      if (((((32767 & ((num$1 + t$1) | 0)) - t$1) | 0) !== 0)) {
        var f$1 = ((e$3$1) => {
          $p_sci_VectorBuilder__addArrN__AO__I__V($thiz, e$3$1, 3);
        });
        var len$1 = slice.a.length;
        var i$1 = 0;
        if ((slice !== null)) {
          while ((i$1 < len$1)) {
            var x0$9 = slice.a[i$1];
            f$1(x0$9);
            i$1 = ((1 + i$1) | 0);
          }
        } else if ((slice instanceof $ac_I)) {
          while ((i$1 < len$1)) {
            var x0$10 = slice.a[i$1];
            f$1(x0$10);
            i$1 = ((1 + i$1) | 0);
          }
        } else if ((slice instanceof $ac_D)) {
          while ((i$1 < len$1)) {
            var x0$11 = slice.a[i$1];
            f$1(x0$11);
            i$1 = ((1 + i$1) | 0);
          }
        } else if ((slice instanceof $ac_J)) {
          while ((i$1 < len$1)) {
            var $x_3 = slice.a;
            var $x_4 = (i$1 << 1);
            var x0$12_$_lo = $x_3[$x_4];
            var x0$12_$_hi = $x_3[(($x_4 + 1) | 0)];
            f$1($bL(x0$12_$_lo, x0$12_$_hi));
            i$1 = ((1 + i$1) | 0);
          }
        } else if ((slice instanceof $ac_F)) {
          while ((i$1 < len$1)) {
            var x0$13 = slice.a[i$1];
            f$1(x0$13);
            i$1 = ((1 + i$1) | 0);
          }
        } else if ((slice instanceof $ac_C)) {
          while ((i$1 < len$1)) {
            var x0$14 = slice.a[i$1];
            f$1($bC(x0$14));
            i$1 = ((1 + i$1) | 0);
          }
        } else if ((slice instanceof $ac_B)) {
          while ((i$1 < len$1)) {
            var x0$15 = slice.a[i$1];
            f$1(x0$15);
            i$1 = ((1 + i$1) | 0);
          }
        } else if ((slice instanceof $ac_S)) {
          while ((i$1 < len$1)) {
            var x0$16 = slice.a[i$1];
            f$1(x0$16);
            i$1 = ((1 + i$1) | 0);
          }
        } else if ((slice instanceof $ac_Z)) {
          while ((i$1 < len$1)) {
            var x0$17 = slice.a[i$1];
            f$1(x0$17);
            i$1 = ((1 + i$1) | 0);
          }
        } else {
          throw new $c_s_MatchError(slice);
        }
        return (void 0);
      }
      var a$2 = (31 & ((((1048576 - $thiz.q) | 0) >>> 15) | 0));
      var copy1$3 = ((a$2 < sl) ? a$2 : sl);
      var copy2$3 = ((sl - copy1$3) | 0);
      var destPos$3 = (31 & (($thiz.q >>> 15) | 0));
      var dest$4 = $thiz.G;
      slice.j(0, dest$4, destPos$3, copy1$3);
      $p_sci_VectorBuilder__advanceN__I__V($thiz, (copy1$3 << 15));
      if ((copy2$3 > 0)) {
        var dest$5 = $thiz.G;
        slice.j(copy1$3, dest$5, 0, copy2$3);
        $p_sci_VectorBuilder__advanceN__I__V($thiz, (copy2$3 << 15));
      }
      break;
    }
    case 5: {
      var num$2 = $thiz.q;
      var t$2 = (((num$2 >> 19) >>> 12) | 0);
      if (((((1048575 & ((num$2 + t$2) | 0)) - t$2) | 0) !== 0)) {
        var f$2 = ((e$3$2) => {
          $p_sci_VectorBuilder__addArrN__AO__I__V($thiz, e$3$2, 4);
        });
        var len$2 = slice.a.length;
        var i$2 = 0;
        if ((slice !== null)) {
          while ((i$2 < len$2)) {
            var x0$18 = slice.a[i$2];
            f$2(x0$18);
            i$2 = ((1 + i$2) | 0);
          }
        } else if ((slice instanceof $ac_I)) {
          while ((i$2 < len$2)) {
            var x0$19 = slice.a[i$2];
            f$2(x0$19);
            i$2 = ((1 + i$2) | 0);
          }
        } else if ((slice instanceof $ac_D)) {
          while ((i$2 < len$2)) {
            var x0$20 = slice.a[i$2];
            f$2(x0$20);
            i$2 = ((1 + i$2) | 0);
          }
        } else if ((slice instanceof $ac_J)) {
          while ((i$2 < len$2)) {
            var $x_5 = slice.a;
            var $x_6 = (i$2 << 1);
            var x0$21_$_lo = $x_5[$x_6];
            var x0$21_$_hi = $x_5[(($x_6 + 1) | 0)];
            f$2($bL(x0$21_$_lo, x0$21_$_hi));
            i$2 = ((1 + i$2) | 0);
          }
        } else if ((slice instanceof $ac_F)) {
          while ((i$2 < len$2)) {
            var x0$22 = slice.a[i$2];
            f$2(x0$22);
            i$2 = ((1 + i$2) | 0);
          }
        } else if ((slice instanceof $ac_C)) {
          while ((i$2 < len$2)) {
            var x0$23 = slice.a[i$2];
            f$2($bC(x0$23));
            i$2 = ((1 + i$2) | 0);
          }
        } else if ((slice instanceof $ac_B)) {
          while ((i$2 < len$2)) {
            var x0$24 = slice.a[i$2];
            f$2(x0$24);
            i$2 = ((1 + i$2) | 0);
          }
        } else if ((slice instanceof $ac_S)) {
          while ((i$2 < len$2)) {
            var x0$25 = slice.a[i$2];
            f$2(x0$25);
            i$2 = ((1 + i$2) | 0);
          }
        } else if ((slice instanceof $ac_Z)) {
          while ((i$2 < len$2)) {
            var x0$26 = slice.a[i$2];
            f$2(x0$26);
            i$2 = ((1 + i$2) | 0);
          }
        } else {
          throw new $c_s_MatchError(slice);
        }
        return (void 0);
      }
      var a$3 = (31 & ((((33554432 - $thiz.q) | 0) >>> 20) | 0));
      var copy1$4 = ((a$3 < sl) ? a$3 : sl);
      var copy2$4 = ((sl - copy1$4) | 0);
      var destPos$4 = (31 & (($thiz.q >>> 20) | 0));
      var dest$6 = $thiz.R;
      slice.j(0, dest$6, destPos$4, copy1$4);
      $p_sci_VectorBuilder__advanceN__I__V($thiz, (copy1$4 << 20));
      if ((copy2$4 > 0)) {
        var dest$7 = $thiz.R;
        slice.j(copy1$4, dest$7, 0, copy2$4);
        $p_sci_VectorBuilder__advanceN__I__V($thiz, (copy2$4 << 20));
      }
      break;
    }
    case 6: {
      var num$3 = $thiz.q;
      var t$3 = (((num$3 >> 24) >>> 7) | 0);
      if (((((33554431 & ((num$3 + t$3) | 0)) - t$3) | 0) !== 0)) {
        var f$3 = ((e$3$3) => {
          $p_sci_VectorBuilder__addArrN__AO__I__V($thiz, e$3$3, 5);
        });
        var len$3 = slice.a.length;
        var i$3 = 0;
        if ((slice !== null)) {
          while ((i$3 < len$3)) {
            var x0$27 = slice.a[i$3];
            f$3(x0$27);
            i$3 = ((1 + i$3) | 0);
          }
        } else if ((slice instanceof $ac_I)) {
          while ((i$3 < len$3)) {
            var x0$28 = slice.a[i$3];
            f$3(x0$28);
            i$3 = ((1 + i$3) | 0);
          }
        } else if ((slice instanceof $ac_D)) {
          while ((i$3 < len$3)) {
            var x0$29 = slice.a[i$3];
            f$3(x0$29);
            i$3 = ((1 + i$3) | 0);
          }
        } else if ((slice instanceof $ac_J)) {
          while ((i$3 < len$3)) {
            var $x_7 = slice.a;
            var $x_8 = (i$3 << 1);
            var x0$30_$_lo = $x_7[$x_8];
            var x0$30_$_hi = $x_7[(($x_8 + 1) | 0)];
            f$3($bL(x0$30_$_lo, x0$30_$_hi));
            i$3 = ((1 + i$3) | 0);
          }
        } else if ((slice instanceof $ac_F)) {
          while ((i$3 < len$3)) {
            var x0$31 = slice.a[i$3];
            f$3(x0$31);
            i$3 = ((1 + i$3) | 0);
          }
        } else if ((slice instanceof $ac_C)) {
          while ((i$3 < len$3)) {
            var x0$32 = slice.a[i$3];
            f$3($bC(x0$32));
            i$3 = ((1 + i$3) | 0);
          }
        } else if ((slice instanceof $ac_B)) {
          while ((i$3 < len$3)) {
            var x0$33 = slice.a[i$3];
            f$3(x0$33);
            i$3 = ((1 + i$3) | 0);
          }
        } else if ((slice instanceof $ac_S)) {
          while ((i$3 < len$3)) {
            var x0$34 = slice.a[i$3];
            f$3(x0$34);
            i$3 = ((1 + i$3) | 0);
          }
        } else if ((slice instanceof $ac_Z)) {
          while ((i$3 < len$3)) {
            var x0$35 = slice.a[i$3];
            f$3(x0$35);
            i$3 = ((1 + i$3) | 0);
          }
        } else {
          throw new $c_s_MatchError(slice);
        }
        return (void 0);
      }
      var destPos$5 = (($thiz.q >>> 25) | 0);
      if ((((destPos$5 + sl) | 0) > 64)) {
        throw $ct_jl_IllegalArgumentException__T__(new $c_jl_IllegalArgumentException(), "exceeding 2^31 elements");
      }
      var dest$8 = $thiz.av;
      slice.j(0, dest$8, destPos$5, sl);
      $p_sci_VectorBuilder__advanceN__I__V($thiz, (sl << 25));
      break;
    }
    default: {
      throw new $c_s_MatchError(dim);
    }
  }
}
function $p_sci_VectorBuilder__addVector__sci_Vector__sci_VectorBuilder($thiz, xs) {
  var sliceCount = xs.bY();
  var sliceIdx = 0;
  while ((sliceIdx < sliceCount)) {
    var slice = xs.bX(sliceIdx);
    matchResult26: {
      var idx = sliceIdx;
      var c = (((sliceCount + ((sliceCount >>> 31) | 0)) | 0) >> 1);
      var a = ((idx - c) | 0);
      var sign = (a >> 31);
      var x37 = ((((1 + c) | 0) - (((a ^ sign) - sign) | 0)) | 0);
      if ((x37 === 1)) {
        $p_sci_VectorBuilder__addArr1__AO__V($thiz, slice);
        break matchResult26;
      }
      if ((($thiz.v === 32) || ($thiz.v === 0))) {
        $p_sci_VectorBuilder__addArrN__AO__I__V($thiz, slice, x37);
        break matchResult26;
      }
      $m_sci_VectorStatics$().ey(((x37 - 2) | 0), slice, new $c_sr_AbstractFunction1_$$Lambda$7afc3dd0acc1681fb022ef921c83979087aaa919(((data$3) => {
        $p_sci_VectorBuilder__addArr1__AO__V($thiz, data$3);
      })));
    }
    sliceIdx = ((1 + sliceIdx) | 0);
  }
  return $thiz;
}
function $p_sci_VectorBuilder__advance__V($thiz) {
  var idx = ((32 + $thiz.q) | 0);
  var xor = (idx ^ $thiz.q);
  $thiz.q = idx;
  $thiz.v = 0;
  $p_sci_VectorBuilder__advance1__I__I__V($thiz, idx, xor);
}
function $p_sci_VectorBuilder__advanceN__I__V($thiz, n) {
  if ((n > 0)) {
    var idx = (($thiz.q + n) | 0);
    var xor = (idx ^ $thiz.q);
    $thiz.q = idx;
    $thiz.v = 0;
    $p_sci_VectorBuilder__advance1__I__I__V($thiz, idx, xor);
  }
}
function $p_sci_VectorBuilder__advance1__I__I__V($thiz, idx, xor) {
  if ((xor <= 0)) {
    throw $ct_jl_IllegalArgumentException__T__(new $c_jl_IllegalArgumentException(), ((((((((((((((((("advance1(" + idx) + ", ") + xor) + "): a1=") + $thiz.I) + ", a2=") + $thiz.u) + ", a3=") + $thiz.B) + ", a4=") + $thiz.G) + ", a5=") + $thiz.R) + ", a6=") + $thiz.av) + ", depth=") + $thiz.C));
  } else if ((xor < 1024)) {
    if (($thiz.C <= 1)) {
      $thiz.u = new ($d_O.r().r().C)(32);
      $thiz.u.a[0] = $thiz.I;
      $thiz.C = 2;
    }
    $thiz.I = new $ac_O(32);
    $thiz.u.a[(31 & ((idx >>> 5) | 0))] = $thiz.I;
  } else if ((xor < 32768)) {
    if (($thiz.C <= 2)) {
      $thiz.B = new ($d_O.r().r().r().C)(32);
      $thiz.B.a[0] = $thiz.u;
      $thiz.C = 3;
    }
    $thiz.I = new $ac_O(32);
    $thiz.u = new ($d_O.r().r().C)(32);
    $thiz.u.a[(31 & ((idx >>> 5) | 0))] = $thiz.I;
    $thiz.B.a[(31 & ((idx >>> 10) | 0))] = $thiz.u;
  } else if ((xor < 1048576)) {
    if (($thiz.C <= 3)) {
      $thiz.G = new ($d_O.r().r().r().r().C)(32);
      $thiz.G.a[0] = $thiz.B;
      $thiz.C = 4;
    }
    $thiz.I = new $ac_O(32);
    $thiz.u = new ($d_O.r().r().C)(32);
    $thiz.B = new ($d_O.r().r().r().C)(32);
    $thiz.u.a[(31 & ((idx >>> 5) | 0))] = $thiz.I;
    $thiz.B.a[(31 & ((idx >>> 10) | 0))] = $thiz.u;
    $thiz.G.a[(31 & ((idx >>> 15) | 0))] = $thiz.B;
  } else if ((xor < 33554432)) {
    if (($thiz.C <= 4)) {
      $thiz.R = new ($d_O.r().r().r().r().r().C)(32);
      $thiz.R.a[0] = $thiz.G;
      $thiz.C = 5;
    }
    $thiz.I = new $ac_O(32);
    $thiz.u = new ($d_O.r().r().C)(32);
    $thiz.B = new ($d_O.r().r().r().C)(32);
    $thiz.G = new ($d_O.r().r().r().r().C)(32);
    $thiz.u.a[(31 & ((idx >>> 5) | 0))] = $thiz.I;
    $thiz.B.a[(31 & ((idx >>> 10) | 0))] = $thiz.u;
    $thiz.G.a[(31 & ((idx >>> 15) | 0))] = $thiz.B;
    $thiz.R.a[(31 & ((idx >>> 20) | 0))] = $thiz.G;
  } else {
    if (($thiz.C <= 5)) {
      $thiz.av = new ($d_O.r().r().r().r().r().r().C)(64);
      $thiz.av.a[0] = $thiz.R;
      $thiz.C = 6;
    }
    $thiz.I = new $ac_O(32);
    $thiz.u = new ($d_O.r().r().C)(32);
    $thiz.B = new ($d_O.r().r().r().C)(32);
    $thiz.G = new ($d_O.r().r().r().r().C)(32);
    $thiz.R = new ($d_O.r().r().r().r().r().C)(32);
    $thiz.u.a[(31 & ((idx >>> 5) | 0))] = $thiz.I;
    $thiz.B.a[(31 & ((idx >>> 10) | 0))] = $thiz.u;
    $thiz.G.a[(31 & ((idx >>> 15) | 0))] = $thiz.B;
    $thiz.R.a[(31 & ((idx >>> 20) | 0))] = $thiz.G;
    $thiz.av.a[((idx >>> 25) | 0)] = $thiz.R;
  }
}
/** @constructor */
function $c_sci_VectorBuilder() {
  this.av = null;
  this.R = null;
  this.G = null;
  this.B = null;
  this.u = null;
  this.I = null;
  this.v = 0;
  this.q = 0;
  this.z = 0;
  this.eg = false;
  this.C = 0;
  this.I = new $ac_O(32);
  this.v = 0;
  this.q = 0;
  this.z = 0;
  this.eg = false;
  this.C = 1;
}
$p = $c_sci_VectorBuilder.prototype = new $h_O();
$p.constructor = $c_sci_VectorBuilder;
/** @constructor */
function $h_sci_VectorBuilder() {
}
$h_sci_VectorBuilder.prototype = $p;
$p.bk = (function(size) {
});
$p.hA = (function(prefix1) {
  this.C = 1;
  var i = prefix1.a.length;
  this.v = (31 & i);
  this.q = ((i - this.v) | 0);
  this.I = ((prefix1.a.length === 32) ? prefix1 : $m_ju_Arrays$().t(prefix1, 0, 32));
  if (((this.v === 0) && (this.q > 0))) {
    this.v = 32;
    this.q = ((this.q - 32) | 0);
  }
});
$p.hz = (function(v) {
  var x28 = v.bY();
  switch (x28) {
    case 0: {
      break;
    }
    case 1: {
      this.C = 1;
      var i = v.b.a.length;
      this.v = (31 & i);
      this.q = ((i - this.v) | 0);
      var a = v.b;
      this.I = ((a.a.length === 32) ? a : $m_ju_Arrays$().t(a, 0, 32));
      break;
    }
    case 3: {
      var d2 = v.aJ;
      var a$1 = v.c;
      this.I = ((a$1.a.length === 32) ? a$1 : $m_ju_Arrays$().t(a$1, 0, 32));
      this.C = 2;
      this.z = ((32 - v.aW) | 0);
      var i$1 = ((v.e + this.z) | 0);
      this.v = (31 & i$1);
      this.q = ((i$1 - this.v) | 0);
      this.u = new ($d_O.r().r().C)(32);
      this.u.a[0] = v.b;
      var dest = this.u;
      var length = d2.a.length;
      d2.j(0, dest, 1, length);
      this.u.a[((1 + d2.a.length) | 0)] = this.I;
      break;
    }
    case 5: {
      var d3 = v.ar;
      var s2 = v.as;
      var a$2 = v.c;
      this.I = ((a$2.a.length === 32) ? a$2 : $m_ju_Arrays$().t(a$2, 0, 32));
      this.C = 3;
      this.z = ((1024 - v.aK) | 0);
      var i$2 = ((v.e + this.z) | 0);
      this.v = (31 & i$2);
      this.q = ((i$2 - this.v) | 0);
      this.B = new ($d_O.r().r().r().C)(32);
      this.B.a[0] = $m_sci_VectorStatics$().c8(v.b, v.aQ);
      var dest$1 = this.B;
      var length$1 = d3.a.length;
      d3.j(0, dest$1, 1, length$1);
      this.u = $m_ju_Arrays$().O(s2, 32);
      this.B.a[((1 + d3.a.length) | 0)] = this.u;
      this.u.a[s2.a.length] = this.I;
      break;
    }
    case 7: {
      var d4 = v.ac;
      var s3 = v.ae;
      var s2$2 = v.ad;
      var a$3 = v.c;
      this.I = ((a$3.a.length === 32) ? a$3 : $m_ju_Arrays$().t(a$3, 0, 32));
      this.C = 4;
      this.z = ((32768 - v.au) | 0);
      var i$3 = ((v.e + this.z) | 0);
      this.v = (31 & i$3);
      this.q = ((i$3 - this.v) | 0);
      this.G = new ($d_O.r().r().r().r().C)(32);
      this.G.a[0] = $m_sci_VectorStatics$().c8($m_sci_VectorStatics$().c8(v.b, v.aB), v.aC);
      var dest$2 = this.G;
      var length$2 = d4.a.length;
      d4.j(0, dest$2, 1, length$2);
      this.B = $m_ju_Arrays$().O(s3, 32);
      this.u = $m_ju_Arrays$().O(s2$2, 32);
      this.G.a[((1 + d4.a.length) | 0)] = this.B;
      this.B.a[s3.a.length] = this.u;
      this.u.a[s2$2.a.length] = this.I;
      break;
    }
    case 9: {
      var d5 = v.T;
      var s4 = v.W;
      var s3$2 = v.V;
      var s2$3 = v.U;
      var a$4 = v.c;
      this.I = ((a$4.a.length === 32) ? a$4 : $m_ju_Arrays$().t(a$4, 0, 32));
      this.C = 5;
      this.z = ((1048576 - v.ah) | 0);
      var i$4 = ((v.e + this.z) | 0);
      this.v = (31 & i$4);
      this.q = ((i$4 - this.v) | 0);
      this.R = new ($d_O.r().r().r().r().r().C)(32);
      this.R.a[0] = $m_sci_VectorStatics$().c8($m_sci_VectorStatics$().c8($m_sci_VectorStatics$().c8(v.b, v.ak), v.al), v.am);
      var dest$3 = this.R;
      var length$3 = d5.a.length;
      d5.j(0, dest$3, 1, length$3);
      this.G = $m_ju_Arrays$().O(s4, 32);
      this.B = $m_ju_Arrays$().O(s3$2, 32);
      this.u = $m_ju_Arrays$().O(s2$3, 32);
      this.R.a[((1 + d5.a.length) | 0)] = this.G;
      this.G.a[s4.a.length] = this.B;
      this.B.a[s3$2.a.length] = this.u;
      this.u.a[s2$3.a.length] = this.I;
      break;
    }
    case 11: {
      var d6 = v.J;
      var s5 = v.N;
      var s4$2 = v.M;
      var s3$3 = v.L;
      var s2$4 = v.K;
      var a$5 = v.c;
      this.I = ((a$5.a.length === 32) ? a$5 : $m_ju_Arrays$().t(a$5, 0, 32));
      this.C = 6;
      this.z = ((33554432 - v.a5) | 0);
      var i$5 = ((v.e + this.z) | 0);
      this.v = (31 & i$5);
      this.q = ((i$5 - this.v) | 0);
      this.av = new ($d_O.r().r().r().r().r().r().C)(64);
      this.av.a[0] = $m_sci_VectorStatics$().c8($m_sci_VectorStatics$().c8($m_sci_VectorStatics$().c8($m_sci_VectorStatics$().c8(v.b, v.a6), v.a7), v.a8), v.a9);
      var dest$4 = this.av;
      var length$4 = d6.a.length;
      d6.j(0, dest$4, 1, length$4);
      this.R = $m_ju_Arrays$().O(s5, 32);
      this.G = $m_ju_Arrays$().O(s4$2, 32);
      this.B = $m_ju_Arrays$().O(s3$3, 32);
      this.u = $m_ju_Arrays$().O(s2$4, 32);
      this.av.a[((1 + d6.a.length) | 0)] = this.R;
      this.R.a[s5.a.length] = this.G;
      this.G.a[s4$2.a.length] = this.B;
      this.B.a[s3$3.a.length] = this.u;
      this.u.a[s2$4.a.length] = this.I;
      break;
    }
    default: {
      throw new $c_s_MatchError(x28);
    }
  }
  if (((this.v === 0) && (this.q > 0))) {
    this.v = 32;
    this.q = ((this.q - 32) | 0);
  }
  return this;
});
$p.dU = (function(elem) {
  if ((this.v === 32)) {
    $p_sci_VectorBuilder__advance__V(this);
  }
  this.I.a[this.v] = elem;
  this.v = ((1 + this.v) | 0);
  return this;
});
$p.g0 = (function(xs) {
  return ((xs instanceof $c_sci_Vector) ? ((((this.v === 0) && (this.q === 0)) && (!this.eg)) ? this.hz(xs) : $p_sci_VectorBuilder__addVector__sci_Vector__sci_VectorBuilder(this, xs)) : $f_scm_Growable__addAll__sc_IterableOnce__scm_Growable(this, xs));
});
$p.cc = (function() {
  if (this.eg) {
    $p_sci_VectorBuilder__leftAlignPrefix__V(this);
  }
  var len = ((this.v + this.q) | 0);
  var realLen = ((len - this.z) | 0);
  if ((realLen === 0)) {
    $m_sci_Vector$();
    return $m_sci_Vector0$();
  } else if ((len < 0)) {
    throw $ct_jl_IndexOutOfBoundsException__T__(new $c_jl_IndexOutOfBoundsException(), ("Vector cannot have negative size " + len));
  } else if ((len <= 32)) {
    var a = this.I;
    return new $c_sci_Vector1(((a.a.length === realLen) ? a : $m_ju_Arrays$().O(a, realLen)));
  } else if ((len <= 1024)) {
    var i1 = (31 & ((len - 1) | 0));
    var i2 = ((((len - 1) | 0) >>> 5) | 0);
    var data = $m_ju_Arrays$().t(this.u, 1, i2);
    var prefix1 = this.u.a[0];
    var a$1 = this.u.a[i2];
    var len$1 = ((1 + i1) | 0);
    var suffix1 = ((a$1.a.length === len$1) ? a$1 : $m_ju_Arrays$().O(a$1, len$1));
    return new $c_sci_Vector2(prefix1, ((32 - this.z) | 0), data, suffix1, realLen);
  } else if ((len <= 32768)) {
    var i1$2 = (31 & ((len - 1) | 0));
    var i2$2 = (31 & ((((len - 1) | 0) >>> 5) | 0));
    var i3 = ((((len - 1) | 0) >>> 10) | 0);
    var data$2 = $m_ju_Arrays$().t(this.B, 1, i3);
    var a$2 = this.B.a[0];
    var prefix2 = $m_ju_Arrays$().t(a$2, 1, a$2.a.length);
    var prefix1$2 = this.B.a[0].a[0];
    var suffix2 = $m_ju_Arrays$().O(this.B.a[i3], i2$2);
    var a$3 = this.B.a[i3].a[i2$2];
    var len$2 = ((1 + i1$2) | 0);
    var suffix1$2 = ((a$3.a.length === len$2) ? a$3 : $m_ju_Arrays$().O(a$3, len$2));
    var len1 = prefix1$2.a.length;
    return new $c_sci_Vector3(prefix1$2, len1, prefix2, ((len1 + (prefix2.a.length << 5)) | 0), data$2, suffix2, suffix1$2, realLen);
  } else if ((len <= 1048576)) {
    var i1$3 = (31 & ((len - 1) | 0));
    var i2$3 = (31 & ((((len - 1) | 0) >>> 5) | 0));
    var i3$2 = (31 & ((((len - 1) | 0) >>> 10) | 0));
    var i4 = ((((len - 1) | 0) >>> 15) | 0);
    var data$3 = $m_ju_Arrays$().t(this.G, 1, i4);
    var a$4 = this.G.a[0];
    var prefix3 = $m_ju_Arrays$().t(a$4, 1, a$4.a.length);
    var a$5 = this.G.a[0].a[0];
    var prefix2$2 = $m_ju_Arrays$().t(a$5, 1, a$5.a.length);
    var prefix1$3 = this.G.a[0].a[0].a[0];
    var suffix3 = $m_ju_Arrays$().O(this.G.a[i4], i3$2);
    var suffix2$2 = $m_ju_Arrays$().O(this.G.a[i4].a[i3$2], i2$3);
    var a$6 = this.G.a[i4].a[i3$2].a[i2$3];
    var len$3 = ((1 + i1$3) | 0);
    var suffix1$3 = ((a$6.a.length === len$3) ? a$6 : $m_ju_Arrays$().O(a$6, len$3));
    var len1$2 = prefix1$3.a.length;
    var len12$2 = ((len1$2 + (prefix2$2.a.length << 5)) | 0);
    return new $c_sci_Vector4(prefix1$3, len1$2, prefix2$2, len12$2, prefix3, ((len12$2 + (prefix3.a.length << 10)) | 0), data$3, suffix3, suffix2$2, suffix1$3, realLen);
  } else if ((len <= 33554432)) {
    var i1$4 = (31 & ((len - 1) | 0));
    var i2$4 = (31 & ((((len - 1) | 0) >>> 5) | 0));
    var i3$3 = (31 & ((((len - 1) | 0) >>> 10) | 0));
    var i4$2 = (31 & ((((len - 1) | 0) >>> 15) | 0));
    var i5 = ((((len - 1) | 0) >>> 20) | 0);
    var data$4 = $m_ju_Arrays$().t(this.R, 1, i5);
    var a$7 = this.R.a[0];
    var prefix4 = $m_ju_Arrays$().t(a$7, 1, a$7.a.length);
    var a$8 = this.R.a[0].a[0];
    var prefix3$2 = $m_ju_Arrays$().t(a$8, 1, a$8.a.length);
    var a$9 = this.R.a[0].a[0].a[0];
    var prefix2$3 = $m_ju_Arrays$().t(a$9, 1, a$9.a.length);
    var prefix1$4 = this.R.a[0].a[0].a[0].a[0];
    var suffix4 = $m_ju_Arrays$().O(this.R.a[i5], i4$2);
    var suffix3$2 = $m_ju_Arrays$().O(this.R.a[i5].a[i4$2], i3$3);
    var suffix2$3 = $m_ju_Arrays$().O(this.R.a[i5].a[i4$2].a[i3$3], i2$4);
    var a$10 = this.R.a[i5].a[i4$2].a[i3$3].a[i2$4];
    var len$4 = ((1 + i1$4) | 0);
    var suffix1$4 = ((a$10.a.length === len$4) ? a$10 : $m_ju_Arrays$().O(a$10, len$4));
    var len1$3 = prefix1$4.a.length;
    var len12$3 = ((len1$3 + (prefix2$3.a.length << 5)) | 0);
    var len123$2 = ((len12$3 + (prefix3$2.a.length << 10)) | 0);
    return new $c_sci_Vector5(prefix1$4, len1$3, prefix2$3, len12$3, prefix3$2, len123$2, prefix4, ((len123$2 + (prefix4.a.length << 15)) | 0), data$4, suffix4, suffix3$2, suffix2$3, suffix1$4, realLen);
  } else {
    var i1$5 = (31 & ((len - 1) | 0));
    var i2$5 = (31 & ((((len - 1) | 0) >>> 5) | 0));
    var i3$4 = (31 & ((((len - 1) | 0) >>> 10) | 0));
    var i4$3 = (31 & ((((len - 1) | 0) >>> 15) | 0));
    var i5$2 = (31 & ((((len - 1) | 0) >>> 20) | 0));
    var i6 = ((((len - 1) | 0) >>> 25) | 0);
    var data$5 = $m_ju_Arrays$().t(this.av, 1, i6);
    var a$11 = this.av.a[0];
    var prefix5 = $m_ju_Arrays$().t(a$11, 1, a$11.a.length);
    var a$12 = this.av.a[0].a[0];
    var prefix4$2 = $m_ju_Arrays$().t(a$12, 1, a$12.a.length);
    var a$13 = this.av.a[0].a[0].a[0];
    var prefix3$3 = $m_ju_Arrays$().t(a$13, 1, a$13.a.length);
    var a$14 = this.av.a[0].a[0].a[0].a[0];
    var prefix2$4 = $m_ju_Arrays$().t(a$14, 1, a$14.a.length);
    var prefix1$5 = this.av.a[0].a[0].a[0].a[0].a[0];
    var suffix5 = $m_ju_Arrays$().O(this.av.a[i6], i5$2);
    var suffix4$2 = $m_ju_Arrays$().O(this.av.a[i6].a[i5$2], i4$3);
    var suffix3$3 = $m_ju_Arrays$().O(this.av.a[i6].a[i5$2].a[i4$3], i3$4);
    var suffix2$4 = $m_ju_Arrays$().O(this.av.a[i6].a[i5$2].a[i4$3].a[i3$4], i2$5);
    var a$15 = this.av.a[i6].a[i5$2].a[i4$3].a[i3$4].a[i2$5];
    var len$5 = ((1 + i1$5) | 0);
    var suffix1$5 = ((a$15.a.length === len$5) ? a$15 : $m_ju_Arrays$().O(a$15, len$5));
    var len1$4 = prefix1$5.a.length;
    var len12$4 = ((len1$4 + (prefix2$4.a.length << 5)) | 0);
    var len123$3 = ((len12$4 + (prefix3$3.a.length << 10)) | 0);
    var len1234$2 = ((len123$3 + (prefix4$2.a.length << 15)) | 0);
    return new $c_sci_Vector6(prefix1$5, len1$4, prefix2$4, len12$4, prefix3$3, len123$3, prefix4$2, len1234$2, prefix5, ((len1234$2 + (prefix5.a.length << 20)) | 0), data$5, suffix5, suffix4$2, suffix3$3, suffix2$4, suffix1$5, realLen);
  }
});
$p.A = (function() {
  return (((((((("VectorBuilder(len1=" + this.v) + ", lenRest=") + this.q) + ", offset=") + this.z) + ", depth=") + this.C) + ")");
});
$p.b8 = (function(elem) {
  return this.dU(elem);
});
$p.b7 = (function(elems) {
  return this.g0(elems);
});
$p.bj = (function() {
  return this.cc();
});
var $d_sci_VectorBuilder = new $TypeData().i($c_sci_VectorBuilder, "scala.collection.immutable.VectorBuilder", ({
  d4: 1,
  B: 1,
  C: 1,
  E: 1,
  a0: 1
}));
/** @constructor */
function $c_scm_ArrayBuffer$() {
  this.fN = null;
  $n_scm_ArrayBuffer$ = this;
  this.fN = new $ac_O(0);
}
$p = $c_scm_ArrayBuffer$.prototype = new $h_O();
$p.constructor = $c_scm_ArrayBuffer$;
/** @constructor */
function $h_scm_ArrayBuffer$() {
}
$h_scm_ArrayBuffer$.prototype = $p;
$p.hq = (function(coll) {
  var k = coll.r();
  if ((k >= 0)) {
    var array = this.gw(this.fN, 0, k);
    var actual = ($is_sc_Iterable(coll) ? coll.c9(array, 0, 2147483647) : coll.k().c9(array, 0, 2147483647));
    if ((actual !== k)) {
      throw new $c_jl_IllegalStateException(((("Copied " + actual) + " of ") + k));
    }
    return $ct_scm_ArrayBuffer__AO__I__(new $c_scm_ArrayBuffer(), array, k);
  } else {
    return $ct_scm_ArrayBuffer__(new $c_scm_ArrayBuffer()).g1(coll);
  }
});
$p.ba = (function() {
  return new $c_scm_ArrayBuffer$$anon$1();
});
$p.i7 = (function(arrayLen, targetLen) {
  if ((targetLen < 0)) {
    throw $ct_jl_RuntimeException__T__(new $c_jl_RuntimeException(), ((((("Overflow while resizing array of array-backed collection. Requested length: " + targetLen) + "; current length: ") + arrayLen) + "; increase: ") + ((targetLen - arrayLen) | 0)));
  } else if ((targetLen <= arrayLen)) {
    return (-1);
  } else {
    if ((targetLen > 2147483639)) {
      throw $ct_jl_RuntimeException__T__(new $c_jl_RuntimeException(), ((("Array of array-backed collection exceeds VM length limit of 2147483639. Requested length: " + targetLen) + "; current length: ") + arrayLen));
    }
    if ((arrayLen > 1073741819)) {
      return 2147483639;
    } else {
      var x = (arrayLen << 1);
      var y = ((x > 16) ? x : 16);
      return ((targetLen > y) ? targetLen : y);
    }
  }
});
$p.gw = (function(array, curSize, targetSize) {
  var newLen = this.i7(array.a.length, targetSize);
  if ((newLen < 0)) {
    return array;
  } else {
    var res = new $ac_O(newLen);
    array.j(0, res, 0, curSize);
    return res;
  }
});
$p.aq = (function(source) {
  return this.hq(source);
});
var $d_scm_ArrayBuffer$ = new $TypeData().i($c_scm_ArrayBuffer$, "scala.collection.mutable.ArrayBuffer$", ({
  d9: 1,
  a: 1,
  x: 1,
  G: 1,
  a2: 1
}));
var $n_scm_ArrayBuffer$;
function $m_scm_ArrayBuffer$() {
  if ((!$n_scm_ArrayBuffer$)) {
    $n_scm_ArrayBuffer$ = new $c_scm_ArrayBuffer$();
  }
  return $n_scm_ArrayBuffer$;
}
/** @constructor */
function $c_scm_ArrayBuffer$$anon$1() {
  this.de = null;
  $ct_scm_GrowableBuilder__scm_Growable__(this, ($m_scm_ArrayBuffer$(), $ct_scm_ArrayBuffer__(new $c_scm_ArrayBuffer())));
}
$p = $c_scm_ArrayBuffer$$anon$1.prototype = new $h_scm_GrowableBuilder();
$p.constructor = $c_scm_ArrayBuffer$$anon$1;
/** @constructor */
function $h_scm_ArrayBuffer$$anon$1() {
}
$h_scm_ArrayBuffer$$anon$1.prototype = $p;
$p.bk = (function(size) {
  this.de.bk(size);
});
var $d_scm_ArrayBuffer$$anon$1 = new $TypeData().i($c_scm_ArrayBuffer$$anon$1, "scala.collection.mutable.ArrayBuffer$$anon$1", ({
  da: 1,
  aX: 1,
  B: 1,
  C: 1,
  E: 1
}));
/** @constructor */
function $c_scm_Buffer$() {
  this.d3 = null;
  $ct_sc_SeqFactory$Delegate__sc_SeqFactory__(this, $m_sjs_js_WrappedArray$());
}
$p = $c_scm_Buffer$.prototype = new $h_sc_SeqFactory$Delegate();
$p.constructor = $c_scm_Buffer$;
/** @constructor */
function $h_scm_Buffer$() {
}
$h_scm_Buffer$.prototype = $p;
var $d_scm_Buffer$ = new $TypeData().i($c_scm_Buffer$, "scala.collection.mutable.Buffer$", ({
  dd: 1,
  ah: 1,
  a: 1,
  x: 1,
  G: 1
}));
var $n_scm_Buffer$;
function $m_scm_Buffer$() {
  if ((!$n_scm_Buffer$)) {
    $n_scm_Buffer$ = new $c_scm_Buffer$();
  }
  return $n_scm_Buffer$;
}
function $ct_scm_ImmutableBuilder__sc_IterableOnce__($thiz, empty) {
  $thiz.dJ = empty;
  return $thiz;
}
/** @constructor */
function $c_scm_ImmutableBuilder() {
  this.dJ = null;
}
$p = $c_scm_ImmutableBuilder.prototype = new $h_O();
$p.constructor = $c_scm_ImmutableBuilder;
/** @constructor */
function $h_scm_ImmutableBuilder() {
}
$h_scm_ImmutableBuilder.prototype = $p;
$p.b7 = (function(elems) {
  return $f_scm_Growable__addAll__sc_IterableOnce__scm_Growable(this, elems);
});
$p.bk = (function(size) {
});
$p.bj = (function() {
  return this.dJ;
});
/** @constructor */
function $c_scm_IndexedSeq$() {
  this.d3 = null;
  $ct_sc_SeqFactory$Delegate__sc_SeqFactory__(this, $m_scm_ArrayBuffer$());
}
$p = $c_scm_IndexedSeq$.prototype = new $h_sc_SeqFactory$Delegate();
$p.constructor = $c_scm_IndexedSeq$;
/** @constructor */
function $h_scm_IndexedSeq$() {
}
$h_scm_IndexedSeq$.prototype = $p;
var $d_scm_IndexedSeq$ = new $TypeData().i($c_scm_IndexedSeq$, "scala.collection.mutable.IndexedSeq$", ({
  dk: 1,
  ah: 1,
  a: 1,
  x: 1,
  G: 1
}));
var $n_scm_IndexedSeq$;
function $m_scm_IndexedSeq$() {
  if ((!$n_scm_IndexedSeq$)) {
    $n_scm_IndexedSeq$ = new $c_scm_IndexedSeq$();
  }
  return $n_scm_IndexedSeq$;
}
/** @constructor */
function $c_scm_ListBuffer$() {
}
$p = $c_scm_ListBuffer$.prototype = new $h_O();
$p.constructor = $c_scm_ListBuffer$;
/** @constructor */
function $h_scm_ListBuffer$() {
}
$h_scm_ListBuffer$.prototype = $p;
$p.ba = (function() {
  return $ct_scm_GrowableBuilder__scm_Growable__(new $c_scm_GrowableBuilder(), new $c_scm_ListBuffer());
});
$p.aq = (function(source) {
  return new $c_scm_ListBuffer().fn(source);
});
var $d_scm_ListBuffer$ = new $TypeData().i($c_scm_ListBuffer$, "scala.collection.mutable.ListBuffer$", ({
  dm: 1,
  a: 1,
  x: 1,
  G: 1,
  a2: 1
}));
var $n_scm_ListBuffer$;
function $m_scm_ListBuffer$() {
  if ((!$n_scm_ListBuffer$)) {
    $n_scm_ListBuffer$ = new $c_scm_ListBuffer$();
  }
  return $n_scm_ListBuffer$;
}
/** @constructor */
function $c_scm_MutationTracker$CheckedIterator(underlying, mutationCount) {
  this.f0 = null;
  this.fS = null;
  this.fR = 0;
  this.f0 = underlying;
  this.fS = mutationCount;
  this.fR = (mutationCount.aw() | 0);
}
$p = $c_scm_MutationTracker$CheckedIterator.prototype = new $h_sc_AbstractIterator();
$p.constructor = $c_scm_MutationTracker$CheckedIterator;
/** @constructor */
function $h_scm_MutationTracker$CheckedIterator() {
}
$h_scm_MutationTracker$CheckedIterator.prototype = $p;
$p.m = (function() {
  $m_scm_MutationTracker$().g7(this.fR, (this.fS.aw() | 0), "mutation occurred during iteration");
  return this.f0.m();
});
$p.g = (function() {
  return this.f0.g();
});
var $d_scm_MutationTracker$CheckedIterator = new $TypeData().i($c_scm_MutationTracker$CheckedIterator, "scala.collection.mutable.MutationTracker$CheckedIterator", ({
  dp: 1,
  m: 1,
  b: 1,
  c: 1,
  n: 1
}));
/** @constructor */
function $c_sr_ScalaRunTime$$anon$1(x$1) {
  this.fX = null;
  this.dK = 0;
  this.fW = 0;
  this.fX = x$1;
  this.dK = 0;
  this.fW = x$1.bb();
}
$p = $c_sr_ScalaRunTime$$anon$1.prototype = new $h_sc_AbstractIterator();
$p.constructor = $c_sr_ScalaRunTime$$anon$1;
/** @constructor */
function $h_sr_ScalaRunTime$$anon$1() {
}
$h_sr_ScalaRunTime$$anon$1.prototype = $p;
$p.m = (function() {
  return (this.dK < this.fW);
});
$p.g = (function() {
  var result = this.fX.bc(this.dK);
  this.dK = ((1 + this.dK) | 0);
  return result;
});
var $d_sr_ScalaRunTime$$anon$1 = new $TypeData().i($c_sr_ScalaRunTime$$anon$1, "scala.runtime.ScalaRunTime$$anon$1", ({
  dP: 1,
  m: 1,
  b: 1,
  c: 1,
  n: 1
}));
/** @constructor */
function $c_sjs_js_WrappedArray$() {
}
$p = $c_sjs_js_WrappedArray$.prototype = new $h_O();
$p.constructor = $c_sjs_js_WrappedArray$;
/** @constructor */
function $h_sjs_js_WrappedArray$() {
}
$h_sjs_js_WrappedArray$.prototype = $p;
$p.ba = (function() {
  return $ct_sjs_js_WrappedArray__(new $c_sjs_js_WrappedArray());
});
$p.hr = (function(source) {
  return $f_scm_Growable__addAll__sc_IterableOnce__scm_Growable($ct_sjs_js_WrappedArray__(new $c_sjs_js_WrappedArray()), source).bj();
});
$p.aq = (function(source) {
  return this.hr(source);
});
var $d_sjs_js_WrappedArray$ = new $TypeData().i($c_sjs_js_WrappedArray$, "scala.scalajs.js.WrappedArray$", ({
  dS: 1,
  a2: 1,
  a: 1,
  x: 1,
  G: 1
}));
var $n_sjs_js_WrappedArray$;
function $m_sjs_js_WrappedArray$() {
  if ((!$n_sjs_js_WrappedArray$)) {
    $n_sjs_js_WrappedArray$ = new $c_sjs_js_WrappedArray$();
  }
  return $n_sjs_js_WrappedArray$;
}
/** @constructor */
function $c_sjsr_WrappedVarArgs$() {
}
$p = $c_sjsr_WrappedVarArgs$.prototype = new $h_O();
$p.constructor = $c_sjsr_WrappedVarArgs$;
/** @constructor */
function $h_sjsr_WrappedVarArgs$() {
}
$h_sjsr_WrappedVarArgs$.prototype = $p;
$p.gj = (function(source) {
  return this.ba().b7(source).bj();
});
$p.ba = (function() {
  return new $c_scm_Builder$$anon$1(new $c_sr_AbstractFunction1_$$Lambda$7afc3dd0acc1681fb022ef921c83979087aaa919(((x$1$2$2) => new $c_sjsr_WrappedVarArgs(x$1$2$2.cF))), $ct_sjs_js_WrappedArray__sjs_js_Array__(new $c_sjs_js_WrappedArray(), []));
});
$p.aq = (function(source) {
  return this.gj(source);
});
var $d_sjsr_WrappedVarArgs$ = new $TypeData().i($c_sjsr_WrappedVarArgs$, "scala.scalajs.runtime.WrappedVarArgs$", ({
  dV: 1,
  a2: 1,
  a: 1,
  x: 1,
  G: 1
}));
var $n_sjsr_WrappedVarArgs$;
function $m_sjsr_WrappedVarArgs$() {
  if ((!$n_sjsr_WrappedVarArgs$)) {
    $n_sjsr_WrappedVarArgs$ = new $c_sjsr_WrappedVarArgs$();
  }
  return $n_sjsr_WrappedVarArgs$;
}
class $c_Lsculpter_ParseError extends $c_jl_RuntimeException {
  constructor() {
    super();
    $ct_jl_Throwable__T__jl_Throwable__Z__Z__(this, null, null, true, true);
  }
}
function $isArrayOf_Lsculpter_ParseError(obj, depth) {
  return (!(!(((obj && obj.$classData) && (obj.$classData.D === depth)) && obj.$classData.B.n.b7)));
}
var $d_Lsculpter_ParseError = new $TypeData().i($c_Lsculpter_ParseError, "sculpter.ParseError", ({
  b7: 1,
  q: 1,
  t: 1,
  r: 1,
  a: 1
}));
/** @constructor */
function $c_Lsculpter_Program(statements) {
  this.cV = null;
  this.cV = statements;
}
$p = $c_Lsculpter_Program.prototype = new $h_O();
$p.constructor = $c_Lsculpter_Program;
/** @constructor */
function $h_Lsculpter_Program() {
}
$h_Lsculpter_Program.prototype = $p;
$p.bK = (function() {
  return new $c_s_Product$$anon$1(this);
});
$p.S = (function() {
  return $m_s_util_hashing_MurmurHash3$().d1(this, (-1728390778), true);
});
$p.P = (function(x$0) {
  if ((this === x$0)) {
    return true;
  } else if ((x$0 instanceof $c_Lsculpter_Program)) {
    var x = this.cV;
    var x$2 = x$0.cV;
    return ((x === null) ? (x$2 === null) : x.P(x$2));
  } else {
    return false;
  }
});
$p.A = (function() {
  return $m_sr_ScalaRunTime$().cW(this);
});
$p.bb = (function() {
  return 1;
});
$p.bd = (function() {
  return "Program";
});
$p.bc = (function(n) {
  if ((n === 0)) {
    return this.cV;
  }
  throw $ct_jl_IndexOutOfBoundsException__T__(new $c_jl_IndexOutOfBoundsException(), ("" + n));
});
function $isArrayOf_Lsculpter_Program(obj, depth) {
  return (!(!(((obj && obj.$classData) && (obj.$classData.D === depth)) && obj.$classData.B.n.b8)));
}
var $d_Lsculpter_Program = new $TypeData().i($c_Lsculpter_Program, "sculpter.Program", ({
  b8: 1,
  a3: 1,
  d: 1,
  v: 1,
  a: 1
}));
/** @constructor */
function $c_Lsculpter_TokenType() {
}
$p = $c_Lsculpter_TokenType.prototype = new $h_O();
$p.constructor = $c_Lsculpter_TokenType;
/** @constructor */
function $h_Lsculpter_TokenType() {
}
$h_Lsculpter_TokenType.prototype = $p;
$p.bK = (function() {
  return new $c_s_Product$$anon$1(this);
});
function $ct_jl_ArrayIndexOutOfBoundsException__T__($thiz, s) {
  $ct_jl_Throwable__T__jl_Throwable__Z__Z__($thiz, s, null, true, true);
  return $thiz;
}
function $ct_jl_ArrayIndexOutOfBoundsException__($thiz) {
  $ct_jl_Throwable__T__jl_Throwable__Z__Z__($thiz, null, null, true, true);
  return $thiz;
}
class $c_jl_ArrayIndexOutOfBoundsException extends $c_jl_IndexOutOfBoundsException {
}
var $d_jl_ArrayIndexOutOfBoundsException = new $TypeData().i($c_jl_ArrayIndexOutOfBoundsException, "java.lang.ArrayIndexOutOfBoundsException", ({
  bf: 1,
  aB: 1,
  q: 1,
  t: 1,
  r: 1,
  a: 1
}));
function $f_jl_Double__equals__O__Z($thiz, that) {
  return Object.is($thiz, that);
}
function $f_jl_Double__hashCode__I($thiz) {
  var valueInt = ($thiz | 0);
  if (((valueInt === $thiz) && ((1.0 / $thiz) !== (-Infinity)))) {
    return valueInt;
  } else if (($thiz !== $thiz)) {
    return 2146959360;
  } else {
    var fpBitsDataView = $fpBitsDataView;
    fpBitsDataView.setFloat64(0, $thiz, true);
    return ((fpBitsDataView.getInt32(0, true) | 0) ^ (fpBitsDataView.getInt32(4, true) | 0));
  }
}
function $f_jl_Double__toString__T($thiz) {
  return ("" + $thiz);
}
function $isArrayOf_jl_Double(obj, depth) {
  return (!(!(((obj && obj.$classData) && (obj.$classData.D === depth)) && obj.$classData.B.n.az)));
}
var $d_jl_Double = new $TypeData().i(0, "java.lang.Double", ({
  az: 1,
  S: 1,
  a: 1,
  L: 1,
  F: 1,
  a4: 1
}), ((x) => ((typeof x) === "number")));
function $f_jl_Float__equals__O__Z($thiz, that) {
  return Object.is($thiz, that);
}
function $f_jl_Float__hashCode__I($thiz) {
  var value = $thiz;
  var valueInt = (value | 0);
  if (((valueInt === value) && ((1.0 / value) !== (-Infinity)))) {
    return valueInt;
  } else if ((value !== value)) {
    return 2146959360;
  } else {
    var fpBitsDataView = $fpBitsDataView;
    fpBitsDataView.setFloat64(0, value, true);
    return ((fpBitsDataView.getInt32(0, true) | 0) ^ (fpBitsDataView.getInt32(4, true) | 0));
  }
}
function $f_jl_Float__toString__T($thiz) {
  return ("" + $thiz);
}
var $d_jl_Float = new $TypeData().i(0, "java.lang.Float", ({
  bm: 1,
  S: 1,
  a: 1,
  L: 1,
  F: 1,
  a4: 1
}), ((x) => $isFloat(x)));
function $f_jl_Integer__equals__O__Z($thiz, that) {
  return Object.is($thiz, that);
}
function $f_jl_Integer__hashCode__I($thiz) {
  return $thiz;
}
function $f_jl_Integer__toString__T($thiz) {
  return ("" + $thiz);
}
var $d_jl_Integer = new $TypeData().i(0, "java.lang.Integer", ({
  bo: 1,
  S: 1,
  a: 1,
  L: 1,
  F: 1,
  a4: 1
}), ((x) => $isInt(x)));
function $f_jl_Long__equals__O__Z($thiz, $thizhi, that) {
  if ((that instanceof $Long)) {
    var $x_1 = that;
    var this$1_$_lo = $x_1.l;
    var this$1_$_hi = $x_1.h;
    return ((($thiz ^ this$1_$_lo) | ($thizhi ^ this$1_$_hi)) === 0);
  } else {
    return false;
  }
}
function $f_jl_Long__hashCode__I($thiz, $thizhi) {
  return ($thiz ^ $thizhi);
}
function $f_jl_Long__toString__T($thiz, $thizhi) {
  return $m_RTLong$().gz($thiz, $thizhi);
}
function $isArrayOf_jl_Long(obj, depth) {
  return (!(!(((obj && obj.$classData) && (obj.$classData.D === depth)) && obj.$classData.B.n.aC)));
}
var $d_jl_Long = new $TypeData().i(0, "java.lang.Long", ({
  aC: 1,
  S: 1,
  a: 1,
  L: 1,
  F: 1,
  a4: 1
}), ((x) => (x instanceof $Long)));
class $c_jl_NumberFormatException extends $c_jl_IllegalArgumentException {
  constructor(s) {
    super();
    $ct_jl_Throwable__T__jl_Throwable__Z__Z__(this, s, null, true, true);
  }
}
var $d_jl_NumberFormatException = new $TypeData().i($c_jl_NumberFormatException, "java.lang.NumberFormatException", ({
  bu: 1,
  aA: 1,
  q: 1,
  t: 1,
  r: 1,
  a: 1
}));
function $f_T__hashCode__I($thiz) {
  var n = $thiz.length;
  var h = 0;
  var i = 0;
  while ((i !== n)) {
    h = (((((h << 5) - h) | 0) + $thiz.charCodeAt(i)) | 0);
    i = ((1 + i) | 0);
  }
  return h;
}
function $f_T__equals__O__Z($thiz, that) {
  return ($thiz === that);
}
function $f_T__toString__T($thiz) {
  return $thiz;
}
var $d_T = new $TypeData().i(0, "java.lang.String", ({
  bx: 1,
  a: 1,
  L: 1,
  ad: 1,
  F: 1,
  a4: 1
}), ((x) => ((typeof x) === "string")));
/** @constructor */
function $c_s_None$() {
}
$p = $c_s_None$.prototype = new $h_s_Option();
$p.constructor = $c_s_None$;
/** @constructor */
function $h_s_None$() {
}
$h_s_None$.prototype = $p;
$p.S = (function() {
  return 2433880;
});
$p.A = (function() {
  return "None";
});
$p.bb = (function() {
  return 0;
});
$p.bd = (function() {
  return "None";
});
$p.bc = (function(n) {
  throw $ct_jl_IndexOutOfBoundsException__T__(new $c_jl_IndexOutOfBoundsException(), ("" + n));
});
$p.hs = (function() {
  throw new $c_ju_NoSuchElementException("None.get");
});
$p.e0 = (function() {
  this.hs();
});
var $d_s_None$ = new $TypeData().i($c_s_None$, "scala.None$", ({
  bV: 1,
  aE: 1,
  b: 1,
  d: 1,
  v: 1,
  a: 1
}));
var $n_s_None$;
function $m_s_None$() {
  if ((!$n_s_None$)) {
    $n_s_None$ = new $c_s_None$();
  }
  return $n_s_None$;
}
/** @constructor */
function $c_s_Some(value) {
  this.aV = null;
  this.aV = value;
}
$p = $c_s_Some.prototype = new $h_s_Option();
$p.constructor = $c_s_Some;
/** @constructor */
function $h_s_Some() {
}
$h_s_Some.prototype = $p;
$p.S = (function() {
  return $m_s_util_hashing_MurmurHash3$().d1(this, 1323286827, true);
});
$p.P = (function(x$0) {
  return ((this === x$0) || ((x$0 instanceof $c_s_Some) && $m_sr_BoxesRunTime$().h(this.aV, x$0.aV)));
});
$p.A = (function() {
  return $m_sr_ScalaRunTime$().cW(this);
});
$p.bb = (function() {
  return 1;
});
$p.bd = (function() {
  return "Some";
});
$p.bc = (function(n) {
  if ((n === 0)) {
    return this.aV;
  }
  throw $ct_jl_IndexOutOfBoundsException__T__(new $c_jl_IndexOutOfBoundsException(), ("" + n));
});
$p.e0 = (function() {
  return this.aV;
});
function $isArrayOf_s_Some(obj, depth) {
  return (!(!(((obj && obj.$classData) && (obj.$classData.D === depth)) && obj.$classData.B.n.aF)));
}
var $d_s_Some = new $TypeData().i($c_s_Some, "scala.Some", ({
  aF: 1,
  aE: 1,
  b: 1,
  d: 1,
  v: 1,
  a: 1
}));
/** @constructor */
function $c_sc_AbstractIterable() {
}
$p = $c_sc_AbstractIterable.prototype = new $h_O();
$p.constructor = $c_sc_AbstractIterable;
/** @constructor */
function $h_sc_AbstractIterable() {
}
$h_sc_AbstractIterable.prototype = $p;
$p.r = (function() {
  return (-1);
});
$p.dY = (function(p) {
  return $f_sc_IterableOnceOps__forall__F1__Z(this, p);
});
$p.l = (function() {
  return $f_sc_IterableOnceOps__isEmpty__Z(this);
});
$p.ay = (function() {
  return $f_sc_IterableOnceOps__size__I(this);
});
$p.c9 = (function(dest, start, n) {
  return $f_sc_IterableOnceOps__copyToArray__O__I__I__I(this, dest, start, n);
});
$p.dV = (function(b, start, sep, end) {
  return $f_sc_IterableOnceOps__addString__scm_StringBuilder__T__T__T__scm_StringBuilder(this, b, start, sep, end);
});
$p.w = (function() {
  return this.k().g();
});
$p.aZ = (function(n) {
  return $f_sc_IterableOps__drop__I__O(this, n);
});
$p.F = (function() {
  return $f_sc_IterableOps__tail__O(this);
});
$p.dZ = (function(coll) {
  return this.bv().aq(coll);
});
$p.c7 = (function() {
  return this.bl();
});
$p.dm = (function(coll) {
  return this.dZ(coll);
});
function $ct_sc_IndexedSeqView$IndexedSeqViewIterator__sc_IndexedSeqView__($thiz, self) {
  $thiz.eM = self;
  $thiz.cd = 0;
  $thiz.aD = self.p();
  return $thiz;
}
function $p_sc_IndexedSeqView$IndexedSeqViewIterator__formatRange$1__I__I($thiz, value) {
  return ((value < 0) ? 0 : ((value > $thiz.aD) ? $thiz.aD : value));
}
/** @constructor */
function $c_sc_IndexedSeqView$IndexedSeqViewIterator() {
  this.eM = null;
  this.cd = 0;
  this.aD = 0;
}
$p = $c_sc_IndexedSeqView$IndexedSeqViewIterator.prototype = new $h_sc_AbstractIterator();
$p.constructor = $c_sc_IndexedSeqView$IndexedSeqViewIterator;
/** @constructor */
function $h_sc_IndexedSeqView$IndexedSeqViewIterator() {
}
$h_sc_IndexedSeqView$IndexedSeqViewIterator.prototype = $p;
$p.r = (function() {
  return this.aD;
});
$p.m = (function() {
  return (this.aD > 0);
});
$p.g = (function() {
  if ((this.aD > 0)) {
    var r = this.eM.x(this.cd);
    this.cd = ((1 + this.cd) | 0);
    this.aD = ((this.aD - 1) | 0);
    return r;
  } else {
    return $m_sc_Iterator$().ab.g();
  }
});
$p.cL = (function(n) {
  if ((n > 0)) {
    this.cd = ((this.cd + n) | 0);
    var b = ((this.aD - n) | 0);
    this.aD = ((b < 0) ? 0 : b);
  }
  return this;
});
$p.e8 = (function(from, until) {
  var formatFrom = $p_sc_IndexedSeqView$IndexedSeqViewIterator__formatRange$1__I__I(this, from);
  var formatUntil = $p_sc_IndexedSeqView$IndexedSeqViewIterator__formatRange$1__I__I(this, until);
  var b = ((formatUntil - formatFrom) | 0);
  this.aD = ((b < 0) ? 0 : b);
  this.cd = ((this.cd + formatFrom) | 0);
  return this;
});
var $d_sc_IndexedSeqView$IndexedSeqViewIterator = new $TypeData().i($c_sc_IndexedSeqView$IndexedSeqViewIterator, "scala.collection.IndexedSeqView$IndexedSeqViewIterator", ({
  aI: 1,
  m: 1,
  b: 1,
  c: 1,
  n: 1,
  a: 1
}));
/** @constructor */
function $c_sc_Iterator$$anon$21() {
  this.dJ = null;
  $ct_scm_ImmutableBuilder__sc_IterableOnce__(this, $m_sc_Iterator$().ab);
}
$p = $c_sc_Iterator$$anon$21.prototype = new $h_scm_ImmutableBuilder();
$p.constructor = $c_sc_Iterator$$anon$21;
/** @constructor */
function $h_sc_Iterator$$anon$21() {
}
$h_sc_Iterator$$anon$21.prototype = $p;
$p.gO = (function(elem) {
  this.dJ = this.dJ.f7(new $c_sr_AbstractFunction0_$$Lambda$07eded5776954a9c145e92c329afd52873ad179c((() => new $c_sc_Iterator$$anon$20(elem))));
  return this;
});
$p.b8 = (function(elem) {
  return this.gO(elem);
});
var $d_sc_Iterator$$anon$21 = new $TypeData().i($c_sc_Iterator$$anon$21, "scala.collection.Iterator$$anon$21", ({
  c6: 1,
  dj: 1,
  B: 1,
  C: 1,
  E: 1,
  a0: 1
}));
function $f_sc_MapOps__getOrElse__O__F0__O($thiz, key, default$1) {
  var x5 = $thiz.ca(key);
  if ((x5 instanceof $c_s_Some)) {
    return x5.aV;
  }
  if (($m_s_None$() === x5)) {
    return default$1.aw();
  }
  throw new $c_s_MatchError(x5);
}
function $f_sc_MapOps__apply__O__O($thiz, key) {
  var x8 = $thiz.ca(key);
  if (($m_s_None$() === x8)) {
    return $thiz.gc(key);
  }
  if ((x8 instanceof $c_s_Some)) {
    return x8.aV;
  }
  throw new $c_s_MatchError(x8);
}
function $f_sc_MapOps__foreachEntry__F2__V($thiz, f) {
  var it = $thiz.k();
  while (it.m()) {
    var next = it.g();
    f.eu(next.az, next.aA);
  }
}
function $f_sc_MapOps__default__O__O($thiz, key) {
  throw new $c_ju_NoSuchElementException(("key not found: " + key));
}
function $f_sc_MapOps__contains__O__Z($thiz, key) {
  return (!$thiz.ca(key).l());
}
function $f_sc_MapOps__addString__scm_StringBuilder__T__T__T__scm_StringBuilder($thiz, sb, start, sep, end) {
  return $f_sc_IterableOnceOps__addString__scm_StringBuilder__T__T__T__scm_StringBuilder(new $c_sc_Iterator$$anon$9(new $c_sr_AbstractFunction1_$$Lambda$7afc3dd0acc1681fb022ef921c83979087aaa919(((x$1$2) => {
    var k = x$1$2.az;
    var v = x$1$2.aA;
    return ((k + " -> ") + v);
  })), $thiz.k()), sb, start, sep, end);
}
function $f_sc_StrictOptimizedSeqOps__appended__O__O($thiz, elem) {
  var b = $thiz.dq().ba();
  $f_scm_Builder__sizeHint__sc_IterableOnce__I__V(b, $thiz, 1);
  b.b7($thiz);
  b.b8(elem);
  return b.bj();
}
/** @constructor */
function $c_sci_HashMapBuilder$$anon$1(hm$1, outer) {
  this.bn = 0;
  this.dA = 0;
  this.cR = null;
  this.bg = 0;
  this.cf = null;
  this.dB = null;
  if ((outer === null)) {
    throw $ct_jl_NullPointerException__(new $c_jl_NullPointerException());
  }
  $ct_sci_ChampBaseIterator__sci_Node__(this, hm$1.aI);
  while (this.m()) {
    var originalHash = this.cR.cM(this.bn);
    outer.dr(outer.c0, this.cR.bt(this.bn), this.cR.bu(this.bn), originalHash, $m_sc_Hashing$().b9(originalHash), 0);
    this.bn = ((1 + this.bn) | 0);
  }
}
$p = $c_sci_HashMapBuilder$$anon$1.prototype = new $h_sci_ChampBaseIterator();
$p.constructor = $c_sci_HashMapBuilder$$anon$1;
/** @constructor */
function $h_sci_HashMapBuilder$$anon$1() {
}
$h_sci_HashMapBuilder$$anon$1.prototype = $p;
$p.g = (function() {
  return $m_sc_Iterator$().ab.g();
});
var $d_sci_HashMapBuilder$$anon$1 = new $TypeData().i($c_sci_HashMapBuilder$$anon$1, "scala.collection.immutable.HashMapBuilder$$anon$1", ({
  cn: 1,
  aN: 1,
  m: 1,
  b: 1,
  c: 1,
  n: 1
}));
function $is_sci_Iterable(obj) {
  return (!(!((obj && obj.$classData) && obj.$classData.n.l)));
}
function $isArrayOf_sci_Iterable(obj, depth) {
  return (!(!(((obj && obj.$classData) && (obj.$classData.D === depth)) && obj.$classData.B.n.l)));
}
/** @constructor */
function $c_sci_Map$Map2$$anon$1(outer) {
  this.cy = 0;
  this.d9 = null;
  if ((outer === null)) {
    throw $ct_jl_NullPointerException__(new $c_jl_NullPointerException());
  }
  $ct_sci_Map$Map2$Map2Iterator__sci_Map$Map2__(this, outer);
}
$p = $c_sci_Map$Map2$$anon$1.prototype = new $h_sci_Map$Map2$Map2Iterator();
$p.constructor = $c_sci_Map$Map2$$anon$1;
/** @constructor */
function $h_sci_Map$Map2$$anon$1() {
}
$h_sci_Map$Map2$$anon$1.prototype = $p;
var $d_sci_Map$Map2$$anon$1 = new $TypeData().i($c_sci_Map$Map2$$anon$1, "scala.collection.immutable.Map$Map2$$anon$1", ({
  cB: 1,
  cC: 1,
  m: 1,
  b: 1,
  c: 1,
  n: 1
}));
/** @constructor */
function $c_sci_Map$Map3$$anon$4(outer) {
  this.cA = 0;
  this.cz = null;
  if ((outer === null)) {
    throw $ct_jl_NullPointerException__(new $c_jl_NullPointerException());
  }
  $ct_sci_Map$Map3$Map3Iterator__sci_Map$Map3__(this, outer);
}
$p = $c_sci_Map$Map3$$anon$4.prototype = new $h_sci_Map$Map3$Map3Iterator();
$p.constructor = $c_sci_Map$Map3$$anon$4;
/** @constructor */
function $h_sci_Map$Map3$$anon$4() {
}
$h_sci_Map$Map3$$anon$4.prototype = $p;
var $d_sci_Map$Map3$$anon$4 = new $TypeData().i($c_sci_Map$Map3$$anon$4, "scala.collection.immutable.Map$Map3$$anon$4", ({
  cD: 1,
  cE: 1,
  m: 1,
  b: 1,
  c: 1,
  n: 1
}));
/** @constructor */
function $c_sci_Map$Map4$$anon$7(outer) {
  this.cB = 0;
  this.c5 = null;
  if ((outer === null)) {
    throw $ct_jl_NullPointerException__(new $c_jl_NullPointerException());
  }
  $ct_sci_Map$Map4$Map4Iterator__sci_Map$Map4__(this, outer);
}
$p = $c_sci_Map$Map4$$anon$7.prototype = new $h_sci_Map$Map4$Map4Iterator();
$p.constructor = $c_sci_Map$Map4$$anon$7;
/** @constructor */
function $h_sci_Map$Map4$$anon$7() {
}
$h_sci_Map$Map4$$anon$7.prototype = $p;
var $d_sci_Map$Map4$$anon$7 = new $TypeData().i($c_sci_Map$Map4$$anon$7, "scala.collection.immutable.Map$Map4$$anon$7", ({
  cF: 1,
  cG: 1,
  m: 1,
  b: 1,
  c: 1,
  n: 1
}));
/** @constructor */
function $c_sci_MapKeyValueTupleHashIterator(rootNode) {
  this.cv = 0;
  this.ee = null;
  this.bo = 0;
  this.dC = null;
  this.dD = null;
  this.eR = 0;
  this.fI = null;
  $ct_sci_ChampBaseReverseIterator__sci_Node__(this, rootNode);
  this.eR = 0;
}
$p = $c_sci_MapKeyValueTupleHashIterator.prototype = new $h_sci_ChampBaseReverseIterator();
$p.constructor = $c_sci_MapKeyValueTupleHashIterator;
/** @constructor */
function $h_sci_MapKeyValueTupleHashIterator() {
}
$h_sci_MapKeyValueTupleHashIterator.prototype = $p;
$p.S = (function() {
  return $m_s_util_hashing_MurmurHash3$().gA(this.eR, $m_sr_Statics$().aj(this.fI), (-889275714));
});
$p.hS = (function() {
  if ((!this.m())) {
    $m_sc_Iterator$().ab.g();
  }
  this.eR = this.ee.cM(this.cv);
  this.fI = this.ee.bu(this.cv);
  this.cv = ((this.cv - 1) | 0);
  return this;
});
$p.g = (function() {
  return this.hS();
});
var $d_sci_MapKeyValueTupleHashIterator = new $TypeData().i($c_sci_MapKeyValueTupleHashIterator, "scala.collection.immutable.MapKeyValueTupleHashIterator", ({
  cJ: 1,
  ck: 1,
  m: 1,
  b: 1,
  c: 1,
  n: 1
}));
/** @constructor */
function $c_sci_MapKeyValueTupleIterator(rootNode) {
  this.bn = 0;
  this.dA = 0;
  this.cR = null;
  this.bg = 0;
  this.cf = null;
  this.dB = null;
  $ct_sci_ChampBaseIterator__sci_Node__(this, rootNode);
}
$p = $c_sci_MapKeyValueTupleIterator.prototype = new $h_sci_ChampBaseIterator();
$p.constructor = $c_sci_MapKeyValueTupleIterator;
/** @constructor */
function $h_sci_MapKeyValueTupleIterator() {
}
$h_sci_MapKeyValueTupleIterator.prototype = $p;
$p.hR = (function() {
  if ((!this.m())) {
    $m_sc_Iterator$().ab.g();
  }
  var payload = this.cR.gm(this.bn);
  this.bn = ((1 + this.bn) | 0);
  return payload;
});
$p.g = (function() {
  return this.hR();
});
var $d_sci_MapKeyValueTupleIterator = new $TypeData().i($c_sci_MapKeyValueTupleIterator, "scala.collection.immutable.MapKeyValueTupleIterator", ({
  cK: 1,
  aN: 1,
  m: 1,
  b: 1,
  c: 1,
  n: 1
}));
function $p_sci_NewVectorIterator__advanceSlice__V($thiz) {
  if (($thiz.bh <= $thiz.ao)) {
    $m_sc_Iterator$().ab.g();
  }
  $thiz.cE = ((1 + $thiz.cE) | 0);
  var slice = $thiz.eT.bX($thiz.cE);
  while ((slice.a.length === 0)) {
    $thiz.cE = ((1 + $thiz.cE) | 0);
    slice = $thiz.eT.bX($thiz.cE);
  }
  $thiz.dF = $thiz.cU;
  var count = $thiz.fK;
  var idx = $thiz.cE;
  var c = (((count + ((count >>> 31) | 0)) | 0) >> 1);
  var a = ((idx - c) | 0);
  var sign = (a >> 31);
  $thiz.cD = ((((1 + c) | 0) - (((a ^ sign) - sign) | 0)) | 0);
  var x46 = $thiz.cD;
  switch (x46) {
    case 1: {
      $thiz.aE = slice;
      break;
    }
    case 2: {
      $thiz.aF = slice;
      break;
    }
    case 3: {
      $thiz.b4 = slice;
      break;
    }
    case 4: {
      $thiz.bN = slice;
      break;
    }
    case 5: {
      $thiz.cT = slice;
      break;
    }
    case 6: {
      $thiz.eS = slice;
      break;
    }
    default: {
      throw new $c_s_MatchError(x46);
    }
  }
  $thiz.cU = (($thiz.dF + Math.imul(slice.a.length, (1 << Math.imul(5, (($thiz.cD - 1) | 0))))) | 0);
  if (($thiz.cU > $thiz.ck)) {
    $thiz.cU = $thiz.ck;
  }
  if (($thiz.cD > 1)) {
    $thiz.da = (((1 << Math.imul(5, $thiz.cD)) - 1) | 0);
  }
}
function $p_sci_NewVectorIterator__advance__V($thiz) {
  var pos = (((($thiz.ao - $thiz.bh) | 0) + $thiz.ck) | 0);
  if ((pos === $thiz.cU)) {
    $p_sci_NewVectorIterator__advanceSlice__V($thiz);
  }
  if (($thiz.cD > 1)) {
    var io = ((pos - $thiz.dF) | 0);
    $p_sci_NewVectorIterator__advanceA__I__I__V($thiz, io, ($thiz.da ^ io));
    $thiz.da = io;
  }
  $thiz.bh = (($thiz.bh - $thiz.ao) | 0);
  var a = $thiz.aE.a.length;
  var b = $thiz.bh;
  $thiz.cj = ((a < b) ? a : b);
  $thiz.ao = 0;
}
function $p_sci_NewVectorIterator__advanceA__I__I__V($thiz, io, xor) {
  if ((xor < 1024)) {
    $thiz.aE = $thiz.aF.a[(31 & ((io >>> 5) | 0))];
  } else if ((xor < 32768)) {
    $thiz.aF = $thiz.b4.a[(31 & ((io >>> 10) | 0))];
    $thiz.aE = $thiz.aF.a[0];
  } else if ((xor < 1048576)) {
    $thiz.b4 = $thiz.bN.a[(31 & ((io >>> 15) | 0))];
    $thiz.aF = $thiz.b4.a[0];
    $thiz.aE = $thiz.aF.a[0];
  } else if ((xor < 33554432)) {
    $thiz.bN = $thiz.cT.a[(31 & ((io >>> 20) | 0))];
    $thiz.b4 = $thiz.bN.a[0];
    $thiz.aF = $thiz.b4.a[0];
    $thiz.aE = $thiz.aF.a[0];
  } else {
    $thiz.cT = $thiz.eS.a[((io >>> 25) | 0)];
    $thiz.bN = $thiz.cT.a[0];
    $thiz.b4 = $thiz.bN.a[0];
    $thiz.aF = $thiz.b4.a[0];
    $thiz.aE = $thiz.aF.a[0];
  }
}
function $p_sci_NewVectorIterator__setA__I__I__V($thiz, io, xor) {
  if ((xor < 1024)) {
    $thiz.aE = $thiz.aF.a[(31 & ((io >>> 5) | 0))];
  } else if ((xor < 32768)) {
    $thiz.aF = $thiz.b4.a[(31 & ((io >>> 10) | 0))];
    $thiz.aE = $thiz.aF.a[(31 & ((io >>> 5) | 0))];
  } else if ((xor < 1048576)) {
    $thiz.b4 = $thiz.bN.a[(31 & ((io >>> 15) | 0))];
    $thiz.aF = $thiz.b4.a[(31 & ((io >>> 10) | 0))];
    $thiz.aE = $thiz.aF.a[(31 & ((io >>> 5) | 0))];
  } else if ((xor < 33554432)) {
    $thiz.bN = $thiz.cT.a[(31 & ((io >>> 20) | 0))];
    $thiz.b4 = $thiz.bN.a[(31 & ((io >>> 15) | 0))];
    $thiz.aF = $thiz.b4.a[(31 & ((io >>> 10) | 0))];
    $thiz.aE = $thiz.aF.a[(31 & ((io >>> 5) | 0))];
  } else {
    $thiz.cT = $thiz.eS.a[((io >>> 25) | 0)];
    $thiz.bN = $thiz.cT.a[(31 & ((io >>> 20) | 0))];
    $thiz.b4 = $thiz.bN.a[(31 & ((io >>> 15) | 0))];
    $thiz.aF = $thiz.b4.a[(31 & ((io >>> 10) | 0))];
    $thiz.aE = $thiz.aF.a[(31 & ((io >>> 5) | 0))];
  }
}
/** @constructor */
function $c_sci_NewVectorIterator(v, totalLength, sliceCount) {
  this.eT = null;
  this.ck = 0;
  this.fK = 0;
  this.aE = null;
  this.aF = null;
  this.b4 = null;
  this.bN = null;
  this.cT = null;
  this.eS = null;
  this.cj = 0;
  this.ao = 0;
  this.da = 0;
  this.bh = 0;
  this.cE = 0;
  this.cD = 0;
  this.dF = 0;
  this.cU = 0;
  this.eT = v;
  this.ck = totalLength;
  this.fK = sliceCount;
  this.aE = v.b;
  this.cj = this.aE.a.length;
  this.ao = 0;
  this.da = 0;
  this.bh = this.ck;
  this.cE = 0;
  this.cD = 1;
  this.dF = 0;
  this.cU = this.cj;
}
$p = $c_sci_NewVectorIterator.prototype = new $h_sc_AbstractIterator();
$p.constructor = $c_sci_NewVectorIterator;
/** @constructor */
function $h_sci_NewVectorIterator() {
}
$h_sci_NewVectorIterator.prototype = $p;
$p.r = (function() {
  return ((this.bh - this.ao) | 0);
});
$p.m = (function() {
  return (this.bh > this.ao);
});
$p.g = (function() {
  if ((this.ao === this.cj)) {
    $p_sci_NewVectorIterator__advance__V(this);
  }
  var r = this.aE.a[this.ao];
  this.ao = ((1 + this.ao) | 0);
  return r;
});
$p.cL = (function(n) {
  if ((n > 0)) {
    var oldpos = ((((this.ao - this.bh) | 0) + this.ck) | 0);
    var a = ((oldpos + n) | 0);
    var b = this.ck;
    var newpos = ((a < b) ? a : b);
    if ((newpos === this.ck)) {
      this.ao = 0;
      this.bh = 0;
      this.cj = 0;
    } else {
      while ((newpos >= this.cU)) {
        $p_sci_NewVectorIterator__advanceSlice__V(this);
      }
      var io = ((newpos - this.dF) | 0);
      if ((this.cD > 1)) {
        $p_sci_NewVectorIterator__setA__I__I__V(this, io, (this.da ^ io));
        this.da = io;
      }
      this.cj = this.aE.a.length;
      this.ao = (31 & io);
      this.bh = ((this.ao + ((this.ck - newpos) | 0)) | 0);
      if ((this.cj > this.bh)) {
        this.cj = this.bh;
      }
    }
  }
  return this;
});
$p.c9 = (function(xs, start, len) {
  var xsLen = $m_jl_reflect_Array$().e1(xs);
  var srcLen = ((this.bh - this.ao) | 0);
  var limit = ((len < srcLen) ? len : srcLen);
  var capacity = ((start < 0) ? xsLen : ((xsLen - start) | 0));
  var total = ((capacity < limit) ? capacity : limit);
  var total$1 = ((total < 0) ? 0 : total);
  var copied = 0;
  var isBoxed = (xs instanceof $ac_O);
  while ((copied < total$1)) {
    if ((this.ao === this.cj)) {
      $p_sci_NewVectorIterator__advance__V(this);
    }
    var a = ((total$1 - copied) | 0);
    var b = ((this.aE.a.length - this.ao) | 0);
    var count = ((a < b) ? a : b);
    if (isBoxed) {
      var src = this.aE;
      var srcPos = this.ao;
      var destPos = ((start + copied) | 0);
      src.j(srcPos, xs, destPos, count);
    } else {
      $m_s_Array$().f8(this.aE, this.ao, xs, ((start + copied) | 0), count);
    }
    this.ao = ((this.ao + count) | 0);
    copied = ((copied + count) | 0);
  }
  return total$1;
});
var $d_sci_NewVectorIterator = new $TypeData().i($c_sci_NewVectorIterator, "scala.collection.immutable.NewVectorIterator", ({
  cM: 1,
  m: 1,
  b: 1,
  c: 1,
  n: 1,
  R: 1
}));
/** @constructor */
function $c_Lsculpter_BinaryStatement(operation, left, right) {
  this.dM = null;
  this.dL = null;
  this.dN = null;
  this.dM = operation;
  this.dL = left;
  this.dN = right;
}
$p = $c_Lsculpter_BinaryStatement.prototype = new $h_O();
$p.constructor = $c_Lsculpter_BinaryStatement;
/** @constructor */
function $h_Lsculpter_BinaryStatement() {
}
$h_Lsculpter_BinaryStatement.prototype = $p;
$p.bK = (function() {
  return new $c_s_Product$$anon$1(this);
});
$p.S = (function() {
  return $m_s_util_hashing_MurmurHash3$().d1(this, 1544282350, true);
});
$p.P = (function(x$0) {
  if ((this === x$0)) {
    return true;
  } else if ((x$0 instanceof $c_Lsculpter_BinaryStatement)) {
    var x = this.dM;
    var x$2 = x$0.dM;
    if (((x === null) ? (x$2 === null) : (x === x$2))) {
      var x$3 = this.dL;
      var x$4 = x$0.dL;
      var $x_1 = ((x$3 === null) ? (x$4 === null) : x$3.P(x$4));
    } else {
      var $x_1 = false;
    }
    if ($x_1) {
      var x$5 = this.dN;
      var x$6 = x$0.dN;
      return ((x$5 === null) ? (x$6 === null) : x$5.P(x$6));
    } else {
      return false;
    }
  } else {
    return false;
  }
});
$p.A = (function() {
  return $m_sr_ScalaRunTime$().cW(this);
});
$p.bb = (function() {
  return 3;
});
$p.bd = (function() {
  return "BinaryStatement";
});
$p.bc = (function(n) {
  switch (n) {
    case 0: {
      return this.dM;
      break;
    }
    case 1: {
      return this.dL;
      break;
    }
    case 2: {
      return this.dN;
      break;
    }
    default: {
      throw $ct_jl_IndexOutOfBoundsException__T__(new $c_jl_IndexOutOfBoundsException(), ("" + n));
    }
  }
});
function $isArrayOf_Lsculpter_BinaryStatement(obj, depth) {
  return (!(!(((obj && obj.$classData) && (obj.$classData.D === depth)) && obj.$classData.B.n.b4)));
}
var $d_Lsculpter_BinaryStatement = new $TypeData().i($c_Lsculpter_BinaryStatement, "sculpter.BinaryStatement", ({
  b4: 1,
  a3: 1,
  ba: 1,
  d: 1,
  v: 1,
  a: 1
}));
/** @constructor */
function $c_Lsculpter_NilExpr() {
}
$p = $c_Lsculpter_NilExpr.prototype = new $h_O();
$p.constructor = $c_Lsculpter_NilExpr;
/** @constructor */
function $h_Lsculpter_NilExpr() {
}
$h_Lsculpter_NilExpr.prototype = $p;
$p.bK = (function() {
  return new $c_s_Product$$anon$1(this);
});
$p.S = (function() {
  return (-681181306);
});
$p.P = (function(x$0) {
  return ((this === x$0) || ((x$0 instanceof $c_Lsculpter_NilExpr) || false));
});
$p.A = (function() {
  return $m_sr_ScalaRunTime$().cW(this);
});
$p.bb = (function() {
  return 0;
});
$p.bd = (function() {
  return "NilExpr";
});
$p.bc = (function(n) {
  throw $ct_jl_IndexOutOfBoundsException__T__(new $c_jl_IndexOutOfBoundsException(), ("" + n));
});
function $isArrayOf_Lsculpter_NilExpr(obj, depth) {
  return (!(!(((obj && obj.$classData) && (obj.$classData.D === depth)) && obj.$classData.B.n.b5)));
}
var $d_Lsculpter_NilExpr = new $TypeData().i($c_Lsculpter_NilExpr, "sculpter.NilExpr", ({
  b5: 1,
  a3: 1,
  as: 1,
  d: 1,
  v: 1,
  a: 1
}));
/** @constructor */
function $c_Lsculpter_NumberExpr(value) {
  this.co = 0.0;
  this.co = value;
}
$p = $c_Lsculpter_NumberExpr.prototype = new $h_O();
$p.constructor = $c_Lsculpter_NumberExpr;
/** @constructor */
function $h_Lsculpter_NumberExpr() {
}
$h_Lsculpter_NumberExpr.prototype = $p;
$p.bK = (function() {
  return new $c_s_Product$$anon$1(this);
});
$p.S = (function() {
  var acc = (-889275714);
  acc = $m_sr_Statics$().y(acc, 1600854270);
  acc = $m_sr_Statics$().y(acc, $m_sr_Statics$().gd(this.co));
  return $m_sr_Statics$().aU(acc, 1);
});
$p.P = (function(x$0) {
  return ((this === x$0) || ((x$0 instanceof $c_Lsculpter_NumberExpr) && (this.co === x$0.co)));
});
$p.A = (function() {
  return $m_sr_ScalaRunTime$().cW(this);
});
$p.bb = (function() {
  return 1;
});
$p.bd = (function() {
  return "NumberExpr";
});
$p.bc = (function(n) {
  if ((n === 0)) {
    return this.co;
  }
  throw $ct_jl_IndexOutOfBoundsException__T__(new $c_jl_IndexOutOfBoundsException(), ("" + n));
});
function $isArrayOf_Lsculpter_NumberExpr(obj, depth) {
  return (!(!(((obj && obj.$classData) && (obj.$classData.D === depth)) && obj.$classData.B.n.b6)));
}
var $d_Lsculpter_NumberExpr = new $TypeData().i($c_Lsculpter_NumberExpr, "sculpter.NumberExpr", ({
  b6: 1,
  a3: 1,
  as: 1,
  d: 1,
  v: 1,
  a: 1
}));
/** @constructor */
function $c_Lsculpter_StackExpr(name) {
  this.aT = null;
  this.aT = name;
}
$p = $c_Lsculpter_StackExpr.prototype = new $h_O();
$p.constructor = $c_Lsculpter_StackExpr;
/** @constructor */
function $h_Lsculpter_StackExpr() {
}
$h_Lsculpter_StackExpr.prototype = $p;
$p.bK = (function() {
  return new $c_s_Product$$anon$1(this);
});
$p.S = (function() {
  return $m_s_util_hashing_MurmurHash3$().d1(this, (-1016641139), true);
});
$p.P = (function(x$0) {
  return ((this === x$0) || ((x$0 instanceof $c_Lsculpter_StackExpr) && (this.aT === x$0.aT)));
});
$p.A = (function() {
  return $m_sr_ScalaRunTime$().cW(this);
});
$p.bb = (function() {
  return 1;
});
$p.bd = (function() {
  return "StackExpr";
});
$p.bc = (function(n) {
  if ((n === 0)) {
    return this.aT;
  }
  throw $ct_jl_IndexOutOfBoundsException__T__(new $c_jl_IndexOutOfBoundsException(), ("" + n));
});
function $isArrayOf_Lsculpter_StackExpr(obj, depth) {
  return (!(!(((obj && obj.$classData) && (obj.$classData.D === depth)) && obj.$classData.B.n.b9)));
}
var $d_Lsculpter_StackExpr = new $TypeData().i($c_Lsculpter_StackExpr, "sculpter.StackExpr", ({
  b9: 1,
  a3: 1,
  as: 1,
  d: 1,
  v: 1,
  a: 1
}));
/** @constructor */
function $c_Lsculpter_UnaryStatement(operation, operand) {
  this.dT = null;
  this.dS = null;
  this.dT = operation;
  this.dS = operand;
}
$p = $c_Lsculpter_UnaryStatement.prototype = new $h_O();
$p.constructor = $c_Lsculpter_UnaryStatement;
/** @constructor */
function $h_Lsculpter_UnaryStatement() {
}
$h_Lsculpter_UnaryStatement.prototype = $p;
$p.bK = (function() {
  return new $c_s_Product$$anon$1(this);
});
$p.S = (function() {
  return $m_s_util_hashing_MurmurHash3$().d1(this, 286906945, true);
});
$p.P = (function(x$0) {
  if ((this === x$0)) {
    return true;
  } else if ((x$0 instanceof $c_Lsculpter_UnaryStatement)) {
    var x = this.dT;
    var x$2 = x$0.dT;
    if (((x === null) ? (x$2 === null) : (x === x$2))) {
      var x$3 = this.dS;
      var x$4 = x$0.dS;
      return ((x$3 === null) ? (x$4 === null) : x$3.P(x$4));
    } else {
      return false;
    }
  } else {
    return false;
  }
});
$p.A = (function() {
  return $m_sr_ScalaRunTime$().cW(this);
});
$p.bb = (function() {
  return 2;
});
$p.bd = (function() {
  return "UnaryStatement";
});
$p.bc = (function(n) {
  if ((n === 0)) {
    return this.dT;
  }
  if ((n === 1)) {
    return this.dS;
  }
  throw $ct_jl_IndexOutOfBoundsException__T__(new $c_jl_IndexOutOfBoundsException(), ("" + n));
});
function $isArrayOf_Lsculpter_UnaryStatement(obj, depth) {
  return (!(!(((obj && obj.$classData) && (obj.$classData.D === depth)) && obj.$classData.B.n.bb)));
}
var $d_Lsculpter_UnaryStatement = new $TypeData().i($c_Lsculpter_UnaryStatement, "sculpter.UnaryStatement", ({
  bb: 1,
  a3: 1,
  ba: 1,
  d: 1,
  v: 1,
  a: 1
}));
function $ct_Ljava_io_PrintStream__Ljava_io_OutputStream__Z__Ljava_nio_charset_Charset__($thiz, _out, autoFlush, charset) {
  $ct_Ljava_io_FilterOutputStream__Ljava_io_OutputStream__($thiz, _out);
  return $thiz;
}
/** @constructor */
function $c_Ljava_io_PrintStream() {
}
$p = $c_Ljava_io_PrintStream.prototype = new $h_Ljava_io_FilterOutputStream();
$p.constructor = $c_Ljava_io_PrintStream;
/** @constructor */
function $h_Ljava_io_PrintStream() {
}
$h_Ljava_io_PrintStream.prototype = $p;
function $f_sc_View__toString__T($thiz) {
  return ($thiz.c7() + "(<not computed>)");
}
function $is_sc_View(obj) {
  return (!(!((obj && obj.$classData) && obj.$classData.n.H)));
}
function $isArrayOf_sc_View(obj, depth) {
  return (!(!(((obj && obj.$classData) && (obj.$classData.D === depth)) && obj.$classData.B.n.H)));
}
/** @constructor */
function $c_scm_CheckedIndexedSeqView$CheckedIterator(self, mutationCount) {
  this.eM = null;
  this.cd = 0;
  this.aD = 0;
  this.fQ = null;
  this.fP = 0;
  this.fQ = mutationCount;
  $ct_sc_IndexedSeqView$IndexedSeqViewIterator__sc_IndexedSeqView__(this, self);
  this.fP = (mutationCount.aw() | 0);
}
$p = $c_scm_CheckedIndexedSeqView$CheckedIterator.prototype = new $h_sc_IndexedSeqView$IndexedSeqViewIterator();
$p.constructor = $c_scm_CheckedIndexedSeqView$CheckedIterator;
/** @constructor */
function $h_scm_CheckedIndexedSeqView$CheckedIterator() {
}
$h_scm_CheckedIndexedSeqView$CheckedIterator.prototype = $p;
$p.m = (function() {
  $m_scm_MutationTracker$().g7(this.fP, (this.fQ.aw() | 0), "mutation occurred during iteration");
  return (this.aD > 0);
});
var $d_scm_CheckedIndexedSeqView$CheckedIterator = new $TypeData().i($c_scm_CheckedIndexedSeqView$CheckedIterator, "scala.collection.mutable.CheckedIndexedSeqView$CheckedIterator", ({
  dg: 1,
  aI: 1,
  m: 1,
  b: 1,
  c: 1,
  n: 1,
  a: 1
}));
/** @constructor */
function $c_s_reflect_AnyValManifest() {
  this.ej = null;
}
$p = $c_s_reflect_AnyValManifest.prototype = new $h_O();
$p.constructor = $c_s_reflect_AnyValManifest;
/** @constructor */
function $h_s_reflect_AnyValManifest() {
}
$h_s_reflect_AnyValManifest.prototype = $p;
$p.A = (function() {
  return this.ej;
});
$p.P = (function(that) {
  return (this === that);
});
$p.S = (function() {
  return $systemIdentityHashCode(this);
});
class $c_sjs_js_JavaScriptException extends $c_jl_RuntimeException {
  constructor(exception) {
    super();
    this.df = null;
    this.df = exception;
    $ct_jl_Throwable__T__jl_Throwable__Z__Z__(this, null, null, true, true);
  }
  e2() {
    return $dp_toString__T(this.df);
  }
  bd() {
    return "JavaScriptException";
  }
  bb() {
    return 1;
  }
  bc(x$1) {
    return ((x$1 === 0) ? this.df : $m_sr_Statics$().hB(x$1));
  }
  bK() {
    return new $c_sr_ScalaRunTime$$anon$1(this);
  }
  S() {
    return $m_s_util_hashing_MurmurHash3$().d1(this, 1744042595, true);
  }
  P(x$1) {
    return ((this === x$1) || ((x$1 instanceof $c_sjs_js_JavaScriptException) && $m_sr_BoxesRunTime$().h(this.df, x$1.df)));
  }
}
function $isArrayOf_sjs_js_JavaScriptException(obj, depth) {
  return (!(!(((obj && obj.$classData) && (obj.$classData.D === depth)) && obj.$classData.B.n.b2)));
}
var $d_sjs_js_JavaScriptException = new $TypeData().i($c_sjs_js_JavaScriptException, "scala.scalajs.js.JavaScriptException", ({
  b2: 1,
  q: 1,
  t: 1,
  r: 1,
  a: 1,
  v: 1,
  d: 1
}));
function $p_jl_JSConsoleBasedPrintStream__doWriteLine__T__V($thiz, line) {
  if (((typeof console) !== "undefined")) {
    if (($thiz.fo && (!(!(!(!console.error)))))) {
      console.error(line);
    } else {
      console.log(line);
    }
  }
}
/** @constructor */
function $c_jl_JSConsoleBasedPrintStream(isErr) {
  this.fo = false;
  this.dt = null;
  this.fo = isErr;
  $ct_Ljava_io_PrintStream__Ljava_io_OutputStream__Z__Ljava_nio_charset_Charset__(this, new $c_jl_JSConsoleBasedPrintStream$DummyOutputStream(), false, null);
  this.dt = "";
}
$p = $c_jl_JSConsoleBasedPrintStream.prototype = new $h_Ljava_io_PrintStream();
$p.constructor = $c_jl_JSConsoleBasedPrintStream;
/** @constructor */
function $h_jl_JSConsoleBasedPrintStream() {
}
$h_jl_JSConsoleBasedPrintStream.prototype = $p;
$p.hD = (function(s) {
  var rest = s;
  while ((rest !== "")) {
    var this$1 = rest;
    var nlPos = (this$1.indexOf("\n") | 0);
    if ((nlPos < 0)) {
      this.dt = (("" + this.dt) + rest);
      rest = "";
    } else {
      var $x_1 = this.dt;
      var this$2 = rest;
      $p_jl_JSConsoleBasedPrintStream__doWriteLine__T__V(this, (("" + $x_1) + this$2.substring(0, nlPos)));
      this.dt = "";
      var this$4 = rest;
      var beginIndex = ((1 + nlPos) | 0);
      rest = this$4.substring(beginIndex);
    }
  }
});
var $d_jl_JSConsoleBasedPrintStream = new $TypeData().i($c_jl_JSConsoleBasedPrintStream, "java.lang.JSConsoleBasedPrintStream", ({
  bq: 1,
  bd: 1,
  bc: 1,
  av: 1,
  at: 1,
  ax: 1,
  au: 1,
  aw: 1
}));
function $p_sc_StrictOptimizedLinearSeqOps__loop$2__I__sc_LinearSeq__sc_LinearSeq($thiz, n, s) {
  var s$tailLocal1 = s;
  var n$tailLocal1 = n;
  while (true) {
    if (((n$tailLocal1 <= 0) || s$tailLocal1.l())) {
      return s$tailLocal1;
    } else {
      var n$tailLocal1$tmp1 = ((n$tailLocal1 - 1) | 0);
      var s$tailLocal1$tmp1 = s$tailLocal1.F();
      n$tailLocal1 = n$tailLocal1$tmp1;
      s$tailLocal1 = s$tailLocal1$tmp1;
    }
  }
}
/** @constructor */
function $c_s_reflect_ManifestFactory$IntManifest() {
  this.ej = null;
}
$p = $c_s_reflect_ManifestFactory$IntManifest.prototype = new $h_s_reflect_AnyValManifest();
$p.constructor = $c_s_reflect_ManifestFactory$IntManifest;
/** @constructor */
function $h_s_reflect_ManifestFactory$IntManifest() {
}
$h_s_reflect_ManifestFactory$IntManifest.prototype = $p;
$p.i9 = (function() {
  return $d_I.l();
});
/** @constructor */
function $c_sc_AbstractView() {
}
$p = $c_sc_AbstractView.prototype = new $h_sc_AbstractIterable();
$p.constructor = $c_sc_AbstractView;
/** @constructor */
function $h_sc_AbstractView() {
}
$h_sc_AbstractView.prototype = $p;
$p.bv = (function() {
  return $m_sc_View$();
});
$p.A = (function() {
  return $f_sc_View__toString__T(this);
});
$p.bl = (function() {
  return "View";
});
/** @constructor */
function $c_s_reflect_ManifestFactory$IntManifest$() {
  this.ej = null;
  this.ej = "Int";
}
$p = $c_s_reflect_ManifestFactory$IntManifest$.prototype = new $h_s_reflect_ManifestFactory$IntManifest();
$p.constructor = $c_s_reflect_ManifestFactory$IntManifest$;
/** @constructor */
function $h_s_reflect_ManifestFactory$IntManifest$() {
}
$h_s_reflect_ManifestFactory$IntManifest$.prototype = $p;
var $d_s_reflect_ManifestFactory$IntManifest$ = new $TypeData().i($c_s_reflect_ManifestFactory$IntManifest$, "scala.reflect.ManifestFactory$IntManifest$", ({
  dB: 1,
  dA: 1,
  dv: 1,
  a: 1,
  dC: 1,
  dw: 1,
  d: 1,
  dx: 1,
  dz: 1
}));
var $n_s_reflect_ManifestFactory$IntManifest$;
function $m_s_reflect_ManifestFactory$IntManifest$() {
  if ((!$n_s_reflect_ManifestFactory$IntManifest$)) {
    $n_s_reflect_ManifestFactory$IntManifest$ = new $c_s_reflect_ManifestFactory$IntManifest$();
  }
  return $n_s_reflect_ManifestFactory$IntManifest$;
}
function $f_sc_Seq__equals__O__Z($thiz, o) {
  if (($thiz === o)) {
    return true;
  } else {
    if ($is_sc_Seq(o)) {
      if (o.f6($thiz)) {
        return $thiz.e7(o);
      }
    }
    return false;
  }
}
function $is_sc_Seq(obj) {
  return (!(!((obj && obj.$classData) && obj.$classData.n.p)));
}
function $isArrayOf_sc_Seq(obj, depth) {
  return (!(!(((obj && obj.$classData) && (obj.$classData.D === depth)) && obj.$classData.B.n.p)));
}
/** @constructor */
function $c_sc_View$$anon$1(it$3) {
  this.fF = null;
  this.fF = it$3;
}
$p = $c_sc_View$$anon$1.prototype = new $h_sc_AbstractView();
$p.constructor = $c_sc_View$$anon$1;
/** @constructor */
function $h_sc_View$$anon$1() {
}
$h_sc_View$$anon$1.prototype = $p;
$p.k = (function() {
  return this.fF.aw();
});
var $d_sc_View$$anon$1 = new $TypeData().i($c_sc_View$$anon$1, "scala.collection.View$$anon$1", ({
  cg: 1,
  O: 1,
  h: 1,
  b: 1,
  c: 1,
  g: 1,
  f: 1,
  e: 1,
  a: 1,
  H: 1
}));
function $ct_sc_View$Drop__sc_IterableOps__I__($thiz, underlying, n) {
  $thiz.d5 = underlying;
  $thiz.dz = n;
  $thiz.cQ = ((n > 0) ? n : 0);
  return $thiz;
}
/** @constructor */
function $c_sc_View$Drop() {
  this.d5 = null;
  this.dz = 0;
  this.cQ = 0;
}
$p = $c_sc_View$Drop.prototype = new $h_sc_AbstractView();
$p.constructor = $c_sc_View$Drop;
/** @constructor */
function $h_sc_View$Drop() {
}
$h_sc_View$Drop.prototype = $p;
$p.k = (function() {
  return this.d5.k().cL(this.dz);
});
$p.r = (function() {
  var size = this.d5.r();
  if ((size >= 0)) {
    var x = ((size - this.cQ) | 0);
    return ((x > 0) ? x : 0);
  } else {
    return (-1);
  }
});
$p.l = (function() {
  return (!this.k().m());
});
var $d_sc_View$Drop = new $TypeData().i($c_sc_View$Drop, "scala.collection.View$Drop", ({
  a7: 1,
  O: 1,
  h: 1,
  b: 1,
  c: 1,
  g: 1,
  f: 1,
  e: 1,
  a: 1,
  H: 1
}));
/** @constructor */
function $c_Lsculpter_TokenType$$anon$1(\u03b4name$5, _$ordinal$5) {
  this.et = null;
  this.et = \u03b4name$5;
}
$p = $c_Lsculpter_TokenType$$anon$1.prototype = new $h_Lsculpter_TokenType();
$p.constructor = $c_Lsculpter_TokenType$$anon$1;
/** @constructor */
function $h_Lsculpter_TokenType$$anon$1() {
}
$h_Lsculpter_TokenType$$anon$1.prototype = $p;
$p.bb = (function() {
  return 0;
});
$p.bc = (function(n) {
  return $f_sr_EnumValue__productElement__I__O(this, n);
});
$p.bd = (function() {
  return this.et;
});
$p.A = (function() {
  return this.et;
});
$p.S = (function() {
  return $f_T__hashCode__I(this.et);
});
var $d_Lsculpter_TokenType$$anon$1 = new $TypeData().i($c_Lsculpter_TokenType$$anon$1, "sculpter.TokenType$$anon$1", ({
  e8: 1,
  e6: 1,
  d: 1,
  v: 1,
  a: 1,
  dy: 1,
  dK: 1,
  b1: 1,
  dq: 1,
  dr: 1
}));
function $f_sc_Map__equals__O__Z($thiz, o) {
  if (($thiz === o)) {
    return true;
  } else if ($is_sc_Map(o)) {
    if (($thiz.ay() === o.ay())) {
      try {
        return $thiz.dY(new $c_sr_AbstractFunction1_$$Lambda$7afc3dd0acc1681fb022ef921c83979087aaa919(((map$1) => ((kv$2) => $m_sr_BoxesRunTime$().h(map$1.cN(kv$2.az, new $c_sr_AbstractFunction0_$$Lambda$07eded5776954a9c145e92c329afd52873ad179c((() => $m_sc_Map$().fD.aw()))), kv$2.aA)))(o)));
      } catch (e) {
        if (false) {
          return false;
        } else {
          throw e;
        }
      }
    } else {
      return false;
    }
  } else {
    return false;
  }
}
function $is_sc_Map(obj) {
  return (!(!((obj && obj.$classData) && obj.$classData.n.M)));
}
function $isArrayOf_sc_Map(obj, depth) {
  return (!(!(((obj && obj.$classData) && (obj.$classData.D === depth)) && obj.$classData.B.n.M)));
}
/** @constructor */
function $c_sc_AbstractSeq() {
}
$p = $c_sc_AbstractSeq.prototype = new $h_sc_AbstractIterable();
$p.constructor = $c_sc_AbstractSeq;
/** @constructor */
function $h_sc_AbstractSeq() {
}
$h_sc_AbstractSeq.prototype = $p;
$p.bw = (function(len) {
  return $f_sc_IterableOps__sizeCompare__I__I(this, len);
});
$p.l = (function() {
  return $f_sc_SeqOps__isEmpty__Z(this);
});
$p.e7 = (function(that) {
  return $f_sc_SeqOps__sameElements__sc_IterableOnce__Z(this, that);
});
$p.f6 = (function(that) {
  return true;
});
$p.P = (function(o) {
  return $f_sc_Seq__equals__O__Z(this, o);
});
$p.S = (function() {
  return $m_s_util_hashing_MurmurHash3$().gx(this);
});
$p.A = (function() {
  return $f_sc_Iterable__toString__T(this);
});
/** @constructor */
function $c_sc_AbstractSeqView() {
}
$p = $c_sc_AbstractSeqView.prototype = new $h_sc_AbstractView();
$p.constructor = $c_sc_AbstractSeqView;
/** @constructor */
function $h_sc_AbstractSeqView() {
}
$h_sc_AbstractSeqView.prototype = $p;
$p.bw = (function(len) {
  return $f_sc_IterableOps__sizeCompare__I__I(this, len);
});
$p.l = (function() {
  return $f_sc_SeqOps__isEmpty__Z(this);
});
$p.cZ = (function(n) {
  return $ct_sc_SeqView$Drop__sc_SeqOps__I__(new $c_sc_SeqView$Drop(), this, n);
});
$p.bl = (function() {
  return "SeqView";
});
$p.aZ = (function(n) {
  return this.cZ(n);
});
function $is_sc_IndexedSeq(obj) {
  return (!(!((obj && obj.$classData) && obj.$classData.n.w)));
}
function $isArrayOf_sc_IndexedSeq(obj, depth) {
  return (!(!(((obj && obj.$classData) && (obj.$classData.D === depth)) && obj.$classData.B.n.w)));
}
function $is_sc_LinearSeq(obj) {
  return (!(!((obj && obj.$classData) && obj.$classData.n.a5)));
}
function $isArrayOf_sc_LinearSeq(obj, depth) {
  return (!(!(((obj && obj.$classData) && (obj.$classData.D === depth)) && obj.$classData.B.n.a5)));
}
function $f_scm_CheckedIndexedSeqView__iterator__sc_Iterator($thiz) {
  return new $c_scm_CheckedIndexedSeqView$CheckedIterator($thiz, new $c_sr_AbstractFunction0_$$Lambda$07eded5776954a9c145e92c329afd52873ad179c((() => ($thiz.hO().aw() | 0))));
}
/** @constructor */
function $c_sc_AbstractMap() {
}
$p = $c_sc_AbstractMap.prototype = new $h_sc_AbstractIterable();
$p.constructor = $c_sc_AbstractMap;
/** @constructor */
function $h_sc_AbstractMap() {
}
$h_sc_AbstractMap.prototype = $p;
$p.cN = (function(key, default$1) {
  return $f_sc_MapOps__getOrElse__O__F0__O(this, key, default$1);
});
$p.f = (function(key) {
  return $f_sc_MapOps__apply__O__O(this, key);
});
$p.d0 = (function(f) {
  $f_sc_MapOps__foreachEntry__F2__V(this, f);
});
$p.gc = (function(key) {
  return $f_sc_MapOps__default__O__O(this, key);
});
$p.cK = (function(key) {
  return $f_sc_MapOps__contains__O__Z(this, key);
});
$p.dV = (function(sb, start, sep, end) {
  return $f_sc_MapOps__addString__scm_StringBuilder__T__T__T__scm_StringBuilder(this, sb, start, sep, end);
});
$p.dZ = (function(coll) {
  return this.e4().aq(coll);
});
$p.P = (function(o) {
  return $f_sc_Map__equals__O__Z(this, o);
});
$p.S = (function() {
  return $m_s_util_hashing_MurmurHash3$().hL(this);
});
$p.bl = (function() {
  return "Map";
});
$p.A = (function() {
  return $f_sc_Iterable__toString__T(this);
});
$p.dm = (function(coll) {
  return this.dZ(coll);
});
function $ct_sc_SeqView$Drop__sc_SeqOps__I__($thiz, underlying, n) {
  $thiz.d4 = underlying;
  $thiz.ec = n;
  $ct_sc_View$Drop__sc_IterableOps__I__($thiz, underlying, n);
  return $thiz;
}
/** @constructor */
function $c_sc_SeqView$Drop() {
  this.d5 = null;
  this.dz = 0;
  this.cQ = 0;
  this.d4 = null;
  this.ec = 0;
}
$p = $c_sc_SeqView$Drop.prototype = new $h_sc_View$Drop();
$p.constructor = $c_sc_SeqView$Drop;
/** @constructor */
function $h_sc_SeqView$Drop() {
}
$h_sc_SeqView$Drop.prototype = $p;
$p.bw = (function(len) {
  return $f_sc_IterableOps__sizeCompare__I__I(this, len);
});
$p.l = (function() {
  return $f_sc_SeqOps__isEmpty__Z(this);
});
$p.bl = (function() {
  return "SeqView";
});
$p.p = (function() {
  var x = ((this.d4.p() - this.cQ) | 0);
  return ((x > 0) ? x : 0);
});
$p.x = (function(i) {
  return this.d4.x(((i + this.cQ) | 0));
});
$p.cZ = (function(n) {
  return $ct_sc_SeqView$Drop__sc_SeqOps__I__(new $c_sc_SeqView$Drop(), this.d4, ((this.ec + n) | 0));
});
$p.aZ = (function(n) {
  return this.cZ(n);
});
var $d_sc_SeqView$Drop = new $TypeData().i($c_sc_SeqView$Drop, "scala.collection.SeqView$Drop", ({
  ai: 1,
  a7: 1,
  O: 1,
  h: 1,
  b: 1,
  c: 1,
  g: 1,
  f: 1,
  e: 1,
  a: 1,
  H: 1,
  k: 1,
  a1: 1
}));
function $ct_sc_SeqView$Id__sc_SeqOps__($thiz, underlying) {
  $thiz.cP = underlying;
  return $thiz;
}
/** @constructor */
function $c_sc_SeqView$Id() {
  this.cP = null;
}
$p = $c_sc_SeqView$Id.prototype = new $h_sc_AbstractSeqView();
$p.constructor = $c_sc_SeqView$Id;
/** @constructor */
function $h_sc_SeqView$Id() {
}
$h_sc_SeqView$Id.prototype = $p;
$p.x = (function(idx) {
  return this.cP.x(idx);
});
$p.p = (function() {
  return this.cP.p();
});
$p.k = (function() {
  return this.cP.k();
});
$p.r = (function() {
  return this.cP.r();
});
$p.l = (function() {
  return this.cP.l();
});
var $d_sc_SeqView$Id = new $TypeData().i($c_sc_SeqView$Id, "scala.collection.SeqView$Id", ({
  aK: 1,
  ae: 1,
  O: 1,
  h: 1,
  b: 1,
  c: 1,
  g: 1,
  f: 1,
  e: 1,
  a: 1,
  H: 1,
  k: 1,
  a1: 1
}));
function $is_sci_Seq(obj) {
  return (!(!((obj && obj.$classData) && obj.$classData.n.z)));
}
function $isArrayOf_sci_Seq(obj, depth) {
  return (!(!(((obj && obj.$classData) && (obj.$classData.D === depth)) && obj.$classData.B.n.z)));
}
function $f_sci_Map__withDefaultValue__O__sci_Map($thiz, d) {
  return new $c_sci_Map$WithDefault($thiz, new $c_sr_AbstractFunction1_$$Lambda$7afc3dd0acc1681fb022ef921c83979087aaa919(((_$1$2) => d)));
}
function $is_sci_Map(obj) {
  return (!(!((obj && obj.$classData) && obj.$classData.n.N)));
}
function $isArrayOf_sci_Map(obj, depth) {
  return (!(!(((obj && obj.$classData) && (obj.$classData.D === depth)) && obj.$classData.B.n.N)));
}
/** @constructor */
function $c_sc_AbstractIndexedSeqView() {
}
$p = $c_sc_AbstractIndexedSeqView.prototype = new $h_sc_AbstractSeqView();
$p.constructor = $c_sc_AbstractIndexedSeqView;
/** @constructor */
function $h_sc_AbstractIndexedSeqView() {
}
$h_sc_AbstractIndexedSeqView.prototype = $p;
$p.w = (function() {
  return $f_sc_IndexedSeqOps__head__O(this);
});
$p.bw = (function(len) {
  var x = this.p();
  return ((x === len) ? 0 : ((x < len) ? (-1) : 1));
});
$p.r = (function() {
  return this.p();
});
$p.bl = (function() {
  return "IndexedSeqView";
});
function $ct_sc_IndexedSeqView$Drop__sc_IndexedSeqOps__I__($thiz, underlying, n) {
  $ct_sc_SeqView$Drop__sc_SeqOps__I__($thiz, underlying, n);
  return $thiz;
}
/** @constructor */
function $c_sc_IndexedSeqView$Drop() {
  this.d5 = null;
  this.dz = 0;
  this.cQ = 0;
  this.d4 = null;
  this.ec = 0;
}
$p = $c_sc_IndexedSeqView$Drop.prototype = new $h_sc_SeqView$Drop();
$p.constructor = $c_sc_IndexedSeqView$Drop;
/** @constructor */
function $h_sc_IndexedSeqView$Drop() {
}
$h_sc_IndexedSeqView$Drop.prototype = $p;
$p.w = (function() {
  return $f_sc_IndexedSeqOps__head__O(this);
});
$p.bw = (function(len) {
  var x = this.p();
  return ((x === len) ? 0 : ((x < len) ? (-1) : 1));
});
$p.r = (function() {
  return this.p();
});
$p.k = (function() {
  return $ct_sc_IndexedSeqView$IndexedSeqViewIterator__sc_IndexedSeqView__(new $c_sc_IndexedSeqView$IndexedSeqViewIterator(), this);
});
$p.dk = (function(n) {
  return $ct_sc_IndexedSeqView$Drop__sc_IndexedSeqOps__I__(new $c_sc_IndexedSeqView$Drop(), this, n);
});
$p.bl = (function() {
  return "IndexedSeqView";
});
$p.aZ = (function(n) {
  return this.dk(n);
});
$p.cZ = (function(n) {
  return this.dk(n);
});
var $d_sc_IndexedSeqView$Drop = new $TypeData().i($c_sc_IndexedSeqView$Drop, "scala.collection.IndexedSeqView$Drop", ({
  aH: 1,
  ai: 1,
  a7: 1,
  O: 1,
  h: 1,
  b: 1,
  c: 1,
  g: 1,
  f: 1,
  e: 1,
  a: 1,
  H: 1,
  k: 1,
  a1: 1,
  s: 1,
  a6: 1
}));
/** @constructor */
function $c_sc_IndexedSeqView$Id(underlying) {
  this.cP = null;
  $ct_sc_SeqView$Id__sc_SeqOps__(this, underlying);
}
$p = $c_sc_IndexedSeqView$Id.prototype = new $h_sc_SeqView$Id();
$p.constructor = $c_sc_IndexedSeqView$Id;
/** @constructor */
function $h_sc_IndexedSeqView$Id() {
}
$h_sc_IndexedSeqView$Id.prototype = $p;
$p.w = (function() {
  return $f_sc_IndexedSeqOps__head__O(this);
});
$p.bw = (function(len) {
  var x = this.p();
  return ((x === len) ? 0 : ((x < len) ? (-1) : 1));
});
$p.r = (function() {
  return this.p();
});
$p.k = (function() {
  return $ct_sc_IndexedSeqView$IndexedSeqViewIterator__sc_IndexedSeqView__(new $c_sc_IndexedSeqView$IndexedSeqViewIterator(), this);
});
$p.bl = (function() {
  return "IndexedSeqView";
});
$p.aZ = (function(n) {
  return $ct_sc_IndexedSeqView$Drop__sc_IndexedSeqOps__I__(new $c_sc_IndexedSeqView$Drop(), this, n);
});
$p.cZ = (function(n) {
  return $ct_sc_IndexedSeqView$Drop__sc_IndexedSeqOps__I__(new $c_sc_IndexedSeqView$Drop(), this, n);
});
var $d_sc_IndexedSeqView$Id = new $TypeData().i($c_sc_IndexedSeqView$Id, "scala.collection.IndexedSeqView$Id", ({
  c1: 1,
  aK: 1,
  ae: 1,
  O: 1,
  h: 1,
  b: 1,
  c: 1,
  g: 1,
  f: 1,
  e: 1,
  a: 1,
  H: 1,
  k: 1,
  a1: 1,
  s: 1,
  a6: 1
}));
/** @constructor */
function $c_sci_AbstractSeq() {
}
$p = $c_sci_AbstractSeq.prototype = new $h_sc_AbstractSeq();
$p.constructor = $c_sci_AbstractSeq;
/** @constructor */
function $h_sci_AbstractSeq() {
}
$h_sci_AbstractSeq.prototype = $p;
/** @constructor */
function $c_scm_ArrayBufferView(underlying, mutationCount) {
  this.eZ = null;
  this.eY = null;
  this.eZ = underlying;
  this.eY = mutationCount;
}
$p = $c_scm_ArrayBufferView.prototype = new $h_sc_AbstractIndexedSeqView();
$p.constructor = $c_scm_ArrayBufferView;
/** @constructor */
function $h_scm_ArrayBufferView() {
}
$h_scm_ArrayBufferView.prototype = $p;
$p.x = (function(n) {
  return this.eZ.x(n);
});
$p.p = (function() {
  return this.eZ.aL;
});
$p.c7 = (function() {
  return "ArrayBufferView";
});
$p.k = (function() {
  return new $c_scm_CheckedIndexedSeqView$CheckedIterator(this, this.eY);
});
$p.dk = (function(n) {
  return new $c_scm_CheckedIndexedSeqView$Drop(this, n, this.eY);
});
$p.aZ = (function(n) {
  return this.dk(n);
});
$p.cZ = (function(n) {
  return this.dk(n);
});
var $d_scm_ArrayBufferView = new $TypeData().i($c_scm_ArrayBufferView, "scala.collection.mutable.ArrayBufferView", ({
  db: 1,
  bZ: 1,
  ae: 1,
  O: 1,
  h: 1,
  b: 1,
  c: 1,
  g: 1,
  f: 1,
  e: 1,
  a: 1,
  H: 1,
  k: 1,
  a1: 1,
  s: 1,
  a6: 1
}));
/** @constructor */
function $c_sci_AbstractMap() {
}
$p = $c_sci_AbstractMap.prototype = new $h_sc_AbstractMap();
$p.constructor = $c_sci_AbstractMap;
/** @constructor */
function $h_sci_AbstractMap() {
}
$h_sci_AbstractMap.prototype = $p;
$p.bv = (function() {
  return $m_sci_Iterable$();
});
$p.e4 = (function() {
  return $m_sci_Map$();
});
function $f_sci_IndexedSeq__canEqual__O__Z($thiz, that) {
  return ($is_sci_IndexedSeq(that) ? ($thiz.p() === that.p()) : true);
}
function $f_sci_IndexedSeq__sameElements__sc_IterableOnce__Z($thiz, o) {
  if ($is_sci_IndexedSeq(o)) {
    if (($thiz === o)) {
      return true;
    } else {
      var length = $thiz.p();
      var equal = (length === o.p());
      if (equal) {
        var index = 0;
        var a = $thiz.f5();
        var b = o.f5();
        var preferredLength = ((a < b) ? a : b);
        var hi = (length >> 31);
        var hi$1 = (preferredLength >> 31);
        var lo = (preferredLength << 1);
        var hi$2 = (((preferredLength >>> 31) | 0) | (hi$1 << 1));
        if (((hi === hi$2) ? ((length >>> 0) > (lo >>> 0)) : (hi > hi$2))) {
          var maxApplyCompare = preferredLength;
        } else {
          var maxApplyCompare = length;
        }
        while (((index < maxApplyCompare) && equal)) {
          equal = $m_sr_BoxesRunTime$().h($thiz.x(index), o.x(index));
          index = ((1 + index) | 0);
        }
        if (((index < length) && equal)) {
          var thisIt = $thiz.k().cL(index);
          var thatIt = o.k().cL(index);
          while ((equal && thisIt.m())) {
            equal = $m_sr_BoxesRunTime$().h(thisIt.g(), thatIt.g());
          }
        }
      }
      return equal;
    }
  } else {
    return $f_sc_SeqOps__sameElements__sc_IterableOnce__Z($thiz, o);
  }
}
function $is_sci_IndexedSeq(obj) {
  return (!(!((obj && obj.$classData) && obj.$classData.n.J)));
}
function $isArrayOf_sci_IndexedSeq(obj, depth) {
  return (!(!(((obj && obj.$classData) && (obj.$classData.D === depth)) && obj.$classData.B.n.J)));
}
function $isArrayOf_sci_SeqMap$SeqMap1(obj, depth) {
  return (!(!(((obj && obj.$classData) && (obj.$classData.D === depth)) && obj.$classData.B.n.cQ)));
}
function $isArrayOf_sci_SeqMap$SeqMap2(obj, depth) {
  return (!(!(((obj && obj.$classData) && (obj.$classData.D === depth)) && obj.$classData.B.n.cR)));
}
function $isArrayOf_sci_SeqMap$SeqMap3(obj, depth) {
  return (!(!(((obj && obj.$classData) && (obj.$classData.D === depth)) && obj.$classData.B.n.cS)));
}
function $isArrayOf_sci_SeqMap$SeqMap4(obj, depth) {
  return (!(!(((obj && obj.$classData) && (obj.$classData.D === depth)) && obj.$classData.B.n.cT)));
}
/** @constructor */
function $c_scm_AbstractSeq() {
}
$p = $c_scm_AbstractSeq.prototype = new $h_sc_AbstractSeq();
$p.constructor = $c_scm_AbstractSeq;
/** @constructor */
function $h_scm_AbstractSeq() {
}
$h_scm_AbstractSeq.prototype = $p;
/** @constructor */
function $c_scm_CheckedIndexedSeqView$Drop(underlying, n, mutationCount) {
  this.d5 = null;
  this.dz = 0;
  this.cQ = 0;
  this.d4 = null;
  this.ec = 0;
  this.dI = null;
  this.dI = mutationCount;
  $ct_sc_IndexedSeqView$Drop__sc_IndexedSeqOps__I__(this, underlying, n);
}
$p = $c_scm_CheckedIndexedSeqView$Drop.prototype = new $h_sc_IndexedSeqView$Drop();
$p.constructor = $c_scm_CheckedIndexedSeqView$Drop;
/** @constructor */
function $h_scm_CheckedIndexedSeqView$Drop() {
}
$h_scm_CheckedIndexedSeqView$Drop.prototype = $p;
$p.k = (function() {
  return $f_scm_CheckedIndexedSeqView__iterator__sc_Iterator(this);
});
$p.dk = (function(n) {
  return new $c_scm_CheckedIndexedSeqView$Drop(this, n, this.dI);
});
$p.hO = (function() {
  return this.dI;
});
$p.aZ = (function(n) {
  return new $c_scm_CheckedIndexedSeqView$Drop(this, n, this.dI);
});
$p.cZ = (function(n) {
  return new $c_scm_CheckedIndexedSeqView$Drop(this, n, this.dI);
});
var $d_scm_CheckedIndexedSeqView$Drop = new $TypeData().i($c_scm_CheckedIndexedSeqView$Drop, "scala.collection.mutable.CheckedIndexedSeqView$Drop", ({
  dh: 1,
  aH: 1,
  ai: 1,
  a7: 1,
  O: 1,
  h: 1,
  b: 1,
  c: 1,
  g: 1,
  f: 1,
  e: 1,
  a: 1,
  H: 1,
  k: 1,
  a1: 1,
  s: 1,
  a6: 1,
  df: 1
}));
/** @constructor */
function $c_sci_Map$EmptyMap$() {
}
$p = $c_sci_Map$EmptyMap$.prototype = new $h_sci_AbstractMap();
$p.constructor = $c_sci_Map$EmptyMap$;
/** @constructor */
function $h_sci_Map$EmptyMap$() {
}
$h_sci_Map$EmptyMap$.prototype = $p;
$p.ay = (function() {
  return 0;
});
$p.r = (function() {
  return 0;
});
$p.l = (function() {
  return true;
});
$p.gW = (function(key) {
  throw new $c_ju_NoSuchElementException(("key not found: " + key));
});
$p.cK = (function(key) {
  return false;
});
$p.ca = (function(key) {
  return $m_s_None$();
});
$p.cN = (function(key, default$1) {
  return default$1.aw();
});
$p.k = (function() {
  return $m_sc_Iterator$().ab;
});
$p.f = (function(key) {
  this.gW(key);
});
$p.aa = (function(key, value) {
  return new $c_sci_Map$Map1(key, value);
});
var $d_sci_Map$EmptyMap$ = new $TypeData().i($c_sci_Map$EmptyMap$, "scala.collection.immutable.Map$EmptyMap$", ({
  cA: 1,
  W: 1,
  T: 1,
  h: 1,
  b: 1,
  c: 1,
  g: 1,
  f: 1,
  e: 1,
  i: 1,
  j: 1,
  V: 1,
  U: 1,
  d: 1,
  M: 1,
  l: 1,
  Y: 1,
  N: 1,
  a: 1
}));
var $n_sci_Map$EmptyMap$;
function $m_sci_Map$EmptyMap$() {
  if ((!$n_sci_Map$EmptyMap$)) {
    $n_sci_Map$EmptyMap$ = new $c_sci_Map$EmptyMap$();
  }
  return $n_sci_Map$EmptyMap$;
}
/** @constructor */
function $c_sci_Map$WithDefault(underlying, defaultValue) {
  this.cC = null;
  this.ef = null;
  this.cC = underlying;
  this.ef = defaultValue;
}
$p = $c_sci_Map$WithDefault.prototype = new $h_sci_AbstractMap();
$p.constructor = $c_sci_Map$WithDefault;
/** @constructor */
function $h_sci_Map$WithDefault() {
}
$h_sci_Map$WithDefault.prototype = $p;
$p.ca = (function(key) {
  return this.cC.ca(key);
});
$p.gc = (function(key) {
  return this.ef.f(key);
});
$p.bv = (function() {
  return this.cC.bv();
});
$p.k = (function() {
  return this.cC.k();
});
$p.l = (function() {
  return this.cC.l();
});
$p.e4 = (function() {
  return this.cC.e4();
});
$p.ip = (function(key, value) {
  return new $c_sci_Map$WithDefault(this.cC.aa(key, value), this.ef);
});
$p.gl = (function(coll) {
  return new $c_sci_Map$WithDefault(this.cC.e4().aq(coll), this.ef);
});
$p.aa = (function(key, value) {
  return this.ip(key, value);
});
$p.dZ = (function(coll) {
  return this.gl(coll);
});
$p.dm = (function(coll) {
  return this.gl(coll);
});
var $d_sci_Map$WithDefault = new $TypeData().i($c_sci_Map$WithDefault, "scala.collection.immutable.Map$WithDefault", ({
  cH: 1,
  W: 1,
  T: 1,
  h: 1,
  b: 1,
  c: 1,
  g: 1,
  f: 1,
  e: 1,
  i: 1,
  j: 1,
  V: 1,
  U: 1,
  d: 1,
  M: 1,
  l: 1,
  Y: 1,
  N: 1,
  a: 1
}));
/** @constructor */
function $c_sci_Map$Map1(key1, value1) {
  this.bM = null;
  this.cx = null;
  this.bM = key1;
  this.cx = value1;
}
$p = $c_sci_Map$Map1.prototype = new $h_sci_AbstractMap();
$p.constructor = $c_sci_Map$Map1;
/** @constructor */
function $h_sci_Map$Map1() {
}
$h_sci_Map$Map1.prototype = $p;
$p.ay = (function() {
  return 1;
});
$p.r = (function() {
  return 1;
});
$p.l = (function() {
  return false;
});
$p.f = (function(key) {
  if ($m_sr_BoxesRunTime$().h(key, this.bM)) {
    return this.cx;
  } else {
    throw new $c_ju_NoSuchElementException(("key not found: " + key));
  }
});
$p.cK = (function(key) {
  return $m_sr_BoxesRunTime$().h(key, this.bM);
});
$p.ca = (function(key) {
  return ($m_sr_BoxesRunTime$().h(key, this.bM) ? new $c_s_Some(this.cx) : $m_s_None$());
});
$p.cN = (function(key, default$1) {
  return ($m_sr_BoxesRunTime$().h(key, this.bM) ? this.cx : default$1.aw());
});
$p.k = (function() {
  return new $c_sc_Iterator$$anon$20(new $c_T2(this.bM, this.cx));
});
$p.d2 = (function(key, value) {
  return ($m_sr_BoxesRunTime$().h(key, this.bM) ? new $c_sci_Map$Map1(this.bM, value) : new $c_sci_Map$Map2(this.bM, this.cx, key, value));
});
$p.dY = (function(p) {
  return (!(!p.f(new $c_T2(this.bM, this.cx))));
});
$p.S = (function() {
  var a = 0;
  var b = 0;
  var c = 1;
  var h = $m_s_util_hashing_MurmurHash3$().bW(this.bM, this.cx);
  a = ((a + h) | 0);
  b = (b ^ h);
  c = Math.imul(c, (1 | h));
  h = $m_s_util_hashing_MurmurHash3$().cG;
  h = $m_s_util_hashing_MurmurHash3$().y(h, a);
  h = $m_s_util_hashing_MurmurHash3$().y(h, b);
  h = $m_s_util_hashing_MurmurHash3$().cq(h, c);
  return $m_s_util_hashing_MurmurHash3$().aU(h, 1);
});
$p.aa = (function(key, value) {
  return this.d2(key, value);
});
function $isArrayOf_sci_Map$Map1(obj, depth) {
  return (!(!(((obj && obj.$classData) && (obj.$classData.D === depth)) && obj.$classData.B.n.aR)));
}
var $d_sci_Map$Map1 = new $TypeData().i($c_sci_Map$Map1, "scala.collection.immutable.Map$Map1", ({
  aR: 1,
  W: 1,
  T: 1,
  h: 1,
  b: 1,
  c: 1,
  g: 1,
  f: 1,
  e: 1,
  i: 1,
  j: 1,
  V: 1,
  U: 1,
  d: 1,
  M: 1,
  l: 1,
  Y: 1,
  N: 1,
  o: 1,
  a: 1
}));
/** @constructor */
function $c_sci_Map$Map2(key1, value1, key2, value2) {
  this.bA = null;
  this.cg = null;
  this.bB = null;
  this.ch = null;
  this.bA = key1;
  this.cg = value1;
  this.bB = key2;
  this.ch = value2;
}
$p = $c_sci_Map$Map2.prototype = new $h_sci_AbstractMap();
$p.constructor = $c_sci_Map$Map2;
/** @constructor */
function $h_sci_Map$Map2() {
}
$h_sci_Map$Map2.prototype = $p;
$p.ay = (function() {
  return 2;
});
$p.r = (function() {
  return 2;
});
$p.l = (function() {
  return false;
});
$p.f = (function(key) {
  if ($m_sr_BoxesRunTime$().h(key, this.bA)) {
    return this.cg;
  } else if ($m_sr_BoxesRunTime$().h(key, this.bB)) {
    return this.ch;
  } else {
    throw new $c_ju_NoSuchElementException(("key not found: " + key));
  }
});
$p.cK = (function(key) {
  return ($m_sr_BoxesRunTime$().h(key, this.bA) || $m_sr_BoxesRunTime$().h(key, this.bB));
});
$p.ca = (function(key) {
  return ($m_sr_BoxesRunTime$().h(key, this.bA) ? new $c_s_Some(this.cg) : ($m_sr_BoxesRunTime$().h(key, this.bB) ? new $c_s_Some(this.ch) : $m_s_None$()));
});
$p.cN = (function(key, default$1) {
  return ($m_sr_BoxesRunTime$().h(key, this.bA) ? this.cg : ($m_sr_BoxesRunTime$().h(key, this.bB) ? this.ch : default$1.aw()));
});
$p.k = (function() {
  return new $c_sci_Map$Map2$$anon$1(this);
});
$p.d2 = (function(key, value) {
  return ($m_sr_BoxesRunTime$().h(key, this.bA) ? new $c_sci_Map$Map2(this.bA, value, this.bB, this.ch) : ($m_sr_BoxesRunTime$().h(key, this.bB) ? new $c_sci_Map$Map2(this.bA, this.cg, this.bB, value) : new $c_sci_Map$Map3(this.bA, this.cg, this.bB, this.ch, key, value)));
});
$p.dY = (function(p) {
  return ((!(!p.f(new $c_T2(this.bA, this.cg)))) && (!(!p.f(new $c_T2(this.bB, this.ch)))));
});
$p.S = (function() {
  var a = 0;
  var b = 0;
  var c = 1;
  var h = $m_s_util_hashing_MurmurHash3$().bW(this.bA, this.cg);
  a = ((a + h) | 0);
  b = (b ^ h);
  c = Math.imul(c, (1 | h));
  h = $m_s_util_hashing_MurmurHash3$().bW(this.bB, this.ch);
  a = ((a + h) | 0);
  b = (b ^ h);
  c = Math.imul(c, (1 | h));
  h = $m_s_util_hashing_MurmurHash3$().cG;
  h = $m_s_util_hashing_MurmurHash3$().y(h, a);
  h = $m_s_util_hashing_MurmurHash3$().y(h, b);
  h = $m_s_util_hashing_MurmurHash3$().cq(h, c);
  return $m_s_util_hashing_MurmurHash3$().aU(h, 2);
});
$p.aa = (function(key, value) {
  return this.d2(key, value);
});
function $isArrayOf_sci_Map$Map2(obj, depth) {
  return (!(!(((obj && obj.$classData) && (obj.$classData.D === depth)) && obj.$classData.B.n.aS)));
}
var $d_sci_Map$Map2 = new $TypeData().i($c_sci_Map$Map2, "scala.collection.immutable.Map$Map2", ({
  aS: 1,
  W: 1,
  T: 1,
  h: 1,
  b: 1,
  c: 1,
  g: 1,
  f: 1,
  e: 1,
  i: 1,
  j: 1,
  V: 1,
  U: 1,
  d: 1,
  M: 1,
  l: 1,
  Y: 1,
  N: 1,
  o: 1,
  a: 1
}));
/** @constructor */
function $c_sci_Map$Map3(key1, value1, key2, value2, key3, value3) {
  this.bp = null;
  this.c2 = null;
  this.bq = null;
  this.c3 = null;
  this.br = null;
  this.c4 = null;
  this.bp = key1;
  this.c2 = value1;
  this.bq = key2;
  this.c3 = value2;
  this.br = key3;
  this.c4 = value3;
}
$p = $c_sci_Map$Map3.prototype = new $h_sci_AbstractMap();
$p.constructor = $c_sci_Map$Map3;
/** @constructor */
function $h_sci_Map$Map3() {
}
$h_sci_Map$Map3.prototype = $p;
$p.ay = (function() {
  return 3;
});
$p.r = (function() {
  return 3;
});
$p.l = (function() {
  return false;
});
$p.f = (function(key) {
  if ($m_sr_BoxesRunTime$().h(key, this.bp)) {
    return this.c2;
  } else if ($m_sr_BoxesRunTime$().h(key, this.bq)) {
    return this.c3;
  } else if ($m_sr_BoxesRunTime$().h(key, this.br)) {
    return this.c4;
  } else {
    throw new $c_ju_NoSuchElementException(("key not found: " + key));
  }
});
$p.cK = (function(key) {
  return (($m_sr_BoxesRunTime$().h(key, this.bp) || $m_sr_BoxesRunTime$().h(key, this.bq)) || $m_sr_BoxesRunTime$().h(key, this.br));
});
$p.ca = (function(key) {
  return ($m_sr_BoxesRunTime$().h(key, this.bp) ? new $c_s_Some(this.c2) : ($m_sr_BoxesRunTime$().h(key, this.bq) ? new $c_s_Some(this.c3) : ($m_sr_BoxesRunTime$().h(key, this.br) ? new $c_s_Some(this.c4) : $m_s_None$())));
});
$p.cN = (function(key, default$1) {
  return ($m_sr_BoxesRunTime$().h(key, this.bp) ? this.c2 : ($m_sr_BoxesRunTime$().h(key, this.bq) ? this.c3 : ($m_sr_BoxesRunTime$().h(key, this.br) ? this.c4 : default$1.aw())));
});
$p.k = (function() {
  return new $c_sci_Map$Map3$$anon$4(this);
});
$p.d2 = (function(key, value) {
  return ($m_sr_BoxesRunTime$().h(key, this.bp) ? new $c_sci_Map$Map3(this.bp, value, this.bq, this.c3, this.br, this.c4) : ($m_sr_BoxesRunTime$().h(key, this.bq) ? new $c_sci_Map$Map3(this.bp, this.c2, this.bq, value, this.br, this.c4) : ($m_sr_BoxesRunTime$().h(key, this.br) ? new $c_sci_Map$Map3(this.bp, this.c2, this.bq, this.c3, this.br, value) : new $c_sci_Map$Map4(this.bp, this.c2, this.bq, this.c3, this.br, this.c4, key, value))));
});
$p.dY = (function(p) {
  return (((!(!p.f(new $c_T2(this.bp, this.c2)))) && (!(!p.f(new $c_T2(this.bq, this.c3))))) && (!(!p.f(new $c_T2(this.br, this.c4)))));
});
$p.S = (function() {
  var a = 0;
  var b = 0;
  var c = 1;
  var h = $m_s_util_hashing_MurmurHash3$().bW(this.bp, this.c2);
  a = ((a + h) | 0);
  b = (b ^ h);
  c = Math.imul(c, (1 | h));
  h = $m_s_util_hashing_MurmurHash3$().bW(this.bq, this.c3);
  a = ((a + h) | 0);
  b = (b ^ h);
  c = Math.imul(c, (1 | h));
  h = $m_s_util_hashing_MurmurHash3$().bW(this.br, this.c4);
  a = ((a + h) | 0);
  b = (b ^ h);
  c = Math.imul(c, (1 | h));
  h = $m_s_util_hashing_MurmurHash3$().cG;
  h = $m_s_util_hashing_MurmurHash3$().y(h, a);
  h = $m_s_util_hashing_MurmurHash3$().y(h, b);
  h = $m_s_util_hashing_MurmurHash3$().cq(h, c);
  return $m_s_util_hashing_MurmurHash3$().aU(h, 3);
});
$p.aa = (function(key, value) {
  return this.d2(key, value);
});
function $isArrayOf_sci_Map$Map3(obj, depth) {
  return (!(!(((obj && obj.$classData) && (obj.$classData.D === depth)) && obj.$classData.B.n.aT)));
}
var $d_sci_Map$Map3 = new $TypeData().i($c_sci_Map$Map3, "scala.collection.immutable.Map$Map3", ({
  aT: 1,
  W: 1,
  T: 1,
  h: 1,
  b: 1,
  c: 1,
  g: 1,
  f: 1,
  e: 1,
  i: 1,
  j: 1,
  V: 1,
  U: 1,
  d: 1,
  M: 1,
  l: 1,
  Y: 1,
  N: 1,
  o: 1,
  a: 1
}));
/** @constructor */
function $c_sci_Map$Map4(key1, value1, key2, value2, key3, value3, key4, value4) {
  this.b0 = null;
  this.bC = null;
  this.b1 = null;
  this.bD = null;
  this.b2 = null;
  this.bE = null;
  this.b3 = null;
  this.bF = null;
  this.b0 = key1;
  this.bC = value1;
  this.b1 = key2;
  this.bD = value2;
  this.b2 = key3;
  this.bE = value3;
  this.b3 = key4;
  this.bF = value4;
}
$p = $c_sci_Map$Map4.prototype = new $h_sci_AbstractMap();
$p.constructor = $c_sci_Map$Map4;
/** @constructor */
function $h_sci_Map$Map4() {
}
$h_sci_Map$Map4.prototype = $p;
$p.ay = (function() {
  return 4;
});
$p.r = (function() {
  return 4;
});
$p.l = (function() {
  return false;
});
$p.f = (function(key) {
  if ($m_sr_BoxesRunTime$().h(key, this.b0)) {
    return this.bC;
  } else if ($m_sr_BoxesRunTime$().h(key, this.b1)) {
    return this.bD;
  } else if ($m_sr_BoxesRunTime$().h(key, this.b2)) {
    return this.bE;
  } else if ($m_sr_BoxesRunTime$().h(key, this.b3)) {
    return this.bF;
  } else {
    throw new $c_ju_NoSuchElementException(("key not found: " + key));
  }
});
$p.cK = (function(key) {
  return ((($m_sr_BoxesRunTime$().h(key, this.b0) || $m_sr_BoxesRunTime$().h(key, this.b1)) || $m_sr_BoxesRunTime$().h(key, this.b2)) || $m_sr_BoxesRunTime$().h(key, this.b3));
});
$p.ca = (function(key) {
  return ($m_sr_BoxesRunTime$().h(key, this.b0) ? new $c_s_Some(this.bC) : ($m_sr_BoxesRunTime$().h(key, this.b1) ? new $c_s_Some(this.bD) : ($m_sr_BoxesRunTime$().h(key, this.b2) ? new $c_s_Some(this.bE) : ($m_sr_BoxesRunTime$().h(key, this.b3) ? new $c_s_Some(this.bF) : $m_s_None$()))));
});
$p.cN = (function(key, default$1) {
  return ($m_sr_BoxesRunTime$().h(key, this.b0) ? this.bC : ($m_sr_BoxesRunTime$().h(key, this.b1) ? this.bD : ($m_sr_BoxesRunTime$().h(key, this.b2) ? this.bE : ($m_sr_BoxesRunTime$().h(key, this.b3) ? this.bF : default$1.aw()))));
});
$p.k = (function() {
  return new $c_sci_Map$Map4$$anon$7(this);
});
$p.d2 = (function(key, value) {
  return ($m_sr_BoxesRunTime$().h(key, this.b0) ? new $c_sci_Map$Map4(this.b0, value, this.b1, this.bD, this.b2, this.bE, this.b3, this.bF) : ($m_sr_BoxesRunTime$().h(key, this.b1) ? new $c_sci_Map$Map4(this.b0, this.bC, this.b1, value, this.b2, this.bE, this.b3, this.bF) : ($m_sr_BoxesRunTime$().h(key, this.b2) ? new $c_sci_Map$Map4(this.b0, this.bC, this.b1, this.bD, this.b2, value, this.b3, this.bF) : ($m_sr_BoxesRunTime$().h(key, this.b3) ? new $c_sci_Map$Map4(this.b0, this.bC, this.b1, this.bD, this.b2, this.bE, this.b3, value) : $m_sci_HashMap$().eP.ds(this.b0, this.bC).ds(this.b1, this.bD).ds(this.b2, this.bE).ds(this.b3, this.bF).ds(key, value)))));
});
$p.dY = (function(p) {
  return ((((!(!p.f(new $c_T2(this.b0, this.bC)))) && (!(!p.f(new $c_T2(this.b1, this.bD))))) && (!(!p.f(new $c_T2(this.b2, this.bE))))) && (!(!p.f(new $c_T2(this.b3, this.bF)))));
});
$p.h3 = (function(builder) {
  return builder.cX(this.b0, this.bC).cX(this.b1, this.bD).cX(this.b2, this.bE).cX(this.b3, this.bF);
});
$p.S = (function() {
  var a = 0;
  var b = 0;
  var c = 1;
  var h = $m_s_util_hashing_MurmurHash3$().bW(this.b0, this.bC);
  a = ((a + h) | 0);
  b = (b ^ h);
  c = Math.imul(c, (1 | h));
  h = $m_s_util_hashing_MurmurHash3$().bW(this.b1, this.bD);
  a = ((a + h) | 0);
  b = (b ^ h);
  c = Math.imul(c, (1 | h));
  h = $m_s_util_hashing_MurmurHash3$().bW(this.b2, this.bE);
  a = ((a + h) | 0);
  b = (b ^ h);
  c = Math.imul(c, (1 | h));
  h = $m_s_util_hashing_MurmurHash3$().bW(this.b3, this.bF);
  a = ((a + h) | 0);
  b = (b ^ h);
  c = Math.imul(c, (1 | h));
  h = $m_s_util_hashing_MurmurHash3$().cG;
  h = $m_s_util_hashing_MurmurHash3$().y(h, a);
  h = $m_s_util_hashing_MurmurHash3$().y(h, b);
  h = $m_s_util_hashing_MurmurHash3$().cq(h, c);
  return $m_s_util_hashing_MurmurHash3$().aU(h, 4);
});
$p.aa = (function(key, value) {
  return this.d2(key, value);
});
function $isArrayOf_sci_Map$Map4(obj, depth) {
  return (!(!(((obj && obj.$classData) && (obj.$classData.D === depth)) && obj.$classData.B.n.aU)));
}
var $d_sci_Map$Map4 = new $TypeData().i($c_sci_Map$Map4, "scala.collection.immutable.Map$Map4", ({
  aU: 1,
  W: 1,
  T: 1,
  h: 1,
  b: 1,
  c: 1,
  g: 1,
  f: 1,
  e: 1,
  i: 1,
  j: 1,
  V: 1,
  U: 1,
  d: 1,
  M: 1,
  l: 1,
  Y: 1,
  N: 1,
  o: 1,
  a: 1
}));
function $ct_sci_LazyList__O__($thiz, lazyState) {
  $thiz.aP = ((lazyState === $m_sci_LazyList$EmptyMarker$()) ? null : $m_sci_LazyList$Uninitialized$());
  $thiz.c1 = ((lazyState === $m_sci_LazyList$EmptyMarker$()) ? null : lazyState);
  return $thiz;
}
function $ct_sci_LazyList__O__sci_LazyList__($thiz, head, tail) {
  $ct_sci_LazyList__O__($thiz, $m_sci_LazyList$EmptyMarker$());
  $thiz.aP = head;
  $thiz.c1 = tail;
  return $thiz;
}
function $p_sci_LazyList__initState__V($thiz) {
  if (($thiz.aP === $m_sci_LazyList$Uninitialized$())) {
    if (($thiz.c1 === $m_sci_LazyList$MidEvaluation$())) {
      throw $ct_jl_RuntimeException__T__(new $c_jl_RuntimeException(), "LazyList evaluation depends on its own result (self-reference); see docs for more info");
    }
    var fun = $thiz.c1;
    $thiz.c1 = $m_sci_LazyList$MidEvaluation$();
    try {
      var l = $p_sci_LazyList__evaluated__sci_LazyList(fun.aw());
    } finally {
      $thiz.c1 = fun;
    }
    $thiz.c1 = l.c1;
    $thiz.aP = l.aP;
  }
}
function $p_sci_LazyList__evaluated__sci_LazyList($thiz) {
  while (true) {
    if (($thiz.aP !== $m_sci_LazyList$Uninitialized$())) {
      return (($thiz.c1 === null) ? $m_sci_LazyList$().Q : $thiz);
    } else {
      $p_sci_LazyList__initState__V($thiz);
    }
  }
}
function $p_sci_LazyList__mapImpl__F1__sci_LazyList($thiz, f) {
  $m_sci_LazyList$();
  return $ct_sci_LazyList__O__(new $c_sci_LazyList(), new $c_sr_AbstractFunction0_$$Lambda$07eded5776954a9c145e92c329afd52873ad179c((() => (($p_sci_LazyList__evaluated__sci_LazyList($thiz) === $m_sci_LazyList$().Q) ? $m_sci_LazyList$().Q : ($m_sci_LazyList$(), $ct_sci_LazyList__O__sci_LazyList__(new $c_sci_LazyList(), f.f($thiz.w()), $p_sci_LazyList__mapImpl__F1__sci_LazyList($thiz.aN(), f)))))));
}
function $p_sci_LazyList__addStringNoForce__jl_StringBuilder__T__T__T__jl_StringBuilder($thiz, b, start, sep, end) {
  b.o = (("" + b.o) + start);
  if (($thiz.aP === $m_sci_LazyList$Uninitialized$())) {
    b.o = (b.o + "<not computed>");
  } else if (($p_sci_LazyList__evaluated__sci_LazyList($thiz) !== $m_sci_LazyList$().Q)) {
    var obj = $thiz.w();
    b.o = (("" + b.o) + obj);
    var cursor = $thiz;
    var scout = $thiz.aN();
    if ((cursor !== scout)) {
      cursor = scout;
      var this$1 = scout;
      if (((this$1.aP !== $m_sci_LazyList$Uninitialized$()) && ($p_sci_LazyList__evaluated__sci_LazyList(this$1) !== $m_sci_LazyList$().Q))) {
        scout = scout.aN();
        while (true) {
          if ((cursor !== scout)) {
            var this$2 = scout;
            var $x_1 = ((this$2.aP !== $m_sci_LazyList$Uninitialized$()) && ($p_sci_LazyList__evaluated__sci_LazyList(this$2) !== $m_sci_LazyList$().Q));
          } else {
            var $x_1 = false;
          }
          if ($x_1) {
            var c = cursor;
            b.o = (("" + b.o) + sep);
            var obj$1 = c.w();
            b.o = (("" + b.o) + obj$1);
            cursor = cursor.aN();
            scout = scout.aN();
            var this$3 = scout;
            if (((this$3.aP !== $m_sci_LazyList$Uninitialized$()) && ($p_sci_LazyList__evaluated__sci_LazyList(this$3) !== $m_sci_LazyList$().Q))) {
              scout = scout.aN();
            }
          } else {
            break;
          }
        }
      }
    }
    var this$4 = scout;
    if ((!((this$4.aP !== $m_sci_LazyList$Uninitialized$()) && ($p_sci_LazyList__evaluated__sci_LazyList(this$4) !== $m_sci_LazyList$().Q)))) {
      while ((cursor !== scout)) {
        var c$1 = cursor;
        b.o = (("" + b.o) + sep);
        var obj$2 = c$1.w();
        b.o = (("" + b.o) + obj$2);
        cursor = cursor.aN();
      }
      if ((!(cursor.aP !== $m_sci_LazyList$Uninitialized$()))) {
        b.o = (("" + b.o) + sep);
        b.o = (b.o + "<not computed>");
      }
    } else {
      if ((cursor !== $thiz)) {
        var runner = $thiz;
        while ((runner !== scout)) {
          runner = runner.aN();
          scout = scout.aN();
        }
        while (true) {
          var ct = cursor.aN();
          if ((ct !== scout)) {
            var c$2 = cursor;
            b.o = (("" + b.o) + sep);
            var obj$3 = c$2.w();
            b.o = (("" + b.o) + obj$3);
          }
          cursor = ct;
          if ((cursor !== scout)) {
          } else {
            break;
          }
        }
      }
      b.o = (("" + b.o) + sep);
      b.o = (b.o + "<cycle>");
    }
  }
  b.o = (("" + b.o) + end);
  return b;
}
/** @constructor */
function $c_sci_LazyList() {
  this.aP = null;
  this.c1 = null;
}
$p = $c_sci_LazyList.prototype = new $h_sci_AbstractSeq();
$p.constructor = $c_sci_LazyList;
/** @constructor */
function $h_sci_LazyList() {
}
$h_sci_LazyList.prototype = $p;
$p.dn = (function() {
  return $f_sc_LinearSeqOps__headOption__s_Option(this);
});
$p.p = (function() {
  return $f_sc_LinearSeqOps__length__I(this);
});
$p.bw = (function(len) {
  return $f_sc_LinearSeqOps__lengthCompare__I__I(this, len);
});
$p.x = (function(n) {
  return $f_sc_LinearSeqOps__apply__I__O(this, n);
});
$p.e7 = (function(that) {
  return $f_sc_LinearSeqOps__sameElements__sc_IterableOnce__Z(this, that);
});
$p.bl = (function() {
  return "LinearSeq";
});
$p.l = (function() {
  return ($p_sci_LazyList__evaluated__sci_LazyList(this) === $m_sci_LazyList$().Q);
});
$p.r = (function() {
  return (((this.aP !== $m_sci_LazyList$Uninitialized$()) && ($p_sci_LazyList__evaluated__sci_LazyList(this) === $m_sci_LazyList$().Q)) ? 0 : (-1));
});
$p.w = (function() {
  if (($p_sci_LazyList__evaluated__sci_LazyList(this) === $m_sci_LazyList$().Q)) {
    throw new $c_ju_NoSuchElementException("head of empty lazy list");
  } else {
    return this.aP;
  }
});
$p.aN = (function() {
  if (($p_sci_LazyList__evaluated__sci_LazyList(this) === $m_sci_LazyList$().Q)) {
    throw $ct_jl_UnsupportedOperationException__T__(new $c_jl_UnsupportedOperationException(), "tail of empty lazy list");
  } else {
    return this.c1;
  }
});
$p.hn = (function() {
  var these = this;
  var those = this;
  if ((!($p_sci_LazyList__evaluated__sci_LazyList(these) === $m_sci_LazyList$().Q))) {
    these = these.aN();
  }
  while ((those !== these)) {
    if (($p_sci_LazyList__evaluated__sci_LazyList(these) === $m_sci_LazyList$().Q)) {
      return this;
    }
    these = these.aN();
    if (($p_sci_LazyList__evaluated__sci_LazyList(these) === $m_sci_LazyList$().Q)) {
      return this;
    }
    these = these.aN();
    if ((these === those)) {
      return this;
    }
    those = those.aN();
  }
  return this;
});
$p.k = (function() {
  return (((this.aP !== $m_sci_LazyList$Uninitialized$()) && ($p_sci_LazyList__evaluated__sci_LazyList(this) === $m_sci_LazyList$().Q)) ? $m_sc_Iterator$().ab : new $c_sci_LazyList$LazyIterator(this));
});
$p.dl = (function(f) {
  var \u03b4this$tailLocal1 = this;
  while (true) {
    if ((!($p_sci_LazyList__evaluated__sci_LazyList(\u03b4this$tailLocal1) === $m_sci_LazyList$().Q))) {
      f.f(\u03b4this$tailLocal1.w());
      \u03b4this$tailLocal1 = \u03b4this$tailLocal1.aN();
    } else {
      return (void 0);
    }
  }
});
$p.c7 = (function() {
  return "LazyList";
});
$p.hH = (function(f) {
  return (((this.aP !== $m_sci_LazyList$Uninitialized$()) && ($p_sci_LazyList__evaluated__sci_LazyList(this) === $m_sci_LazyList$().Q)) ? $m_sci_LazyList$().Q : $p_sci_LazyList__mapImpl__F1__sci_LazyList(this, f));
});
$p.he = (function(n) {
  return ((n <= 0) ? this : (((this.aP !== $m_sci_LazyList$Uninitialized$()) && ($p_sci_LazyList__evaluated__sci_LazyList(this) === $m_sci_LazyList$().Q)) ? $m_sci_LazyList$().Q : $m_sci_LazyList$().ia(this, n)));
});
$p.dV = (function(sb, start, sep, end) {
  this.hn();
  $p_sci_LazyList__addStringNoForce__jl_StringBuilder__T__T__T__jl_StringBuilder(this, sb.aM, start, sep, end);
  return sb;
});
$p.A = (function() {
  return $p_sci_LazyList__addStringNoForce__jl_StringBuilder__T__T__T__jl_StringBuilder(this, $ct_jl_StringBuilder__T__(new $c_jl_StringBuilder(), "LazyList"), "(", ", ", ")").o;
});
$p.bv = (function() {
  return $m_sci_LazyList$();
});
$p.F = (function() {
  return this.aN();
});
$p.cb = (function(f) {
  return this.hH(f);
});
$p.aZ = (function(n) {
  return this.he(n);
});
$p.f = (function(v1) {
  return $f_sc_LinearSeqOps__apply__I__O(this, (v1 | 0));
});
function $isArrayOf_sci_LazyList(obj, depth) {
  return (!(!(((obj && obj.$classData) && (obj.$classData.D === depth)) && obj.$classData.B.n.aQ)));
}
var $d_sci_LazyList = new $TypeData().i($c_sci_LazyList, "scala.collection.immutable.LazyList", ({
  aQ: 1,
  I: 1,
  u: 1,
  h: 1,
  b: 1,
  c: 1,
  g: 1,
  f: 1,
  e: 1,
  i: 1,
  j: 1,
  k: 1,
  d: 1,
  p: 1,
  l: 1,
  D: 1,
  z: 1,
  af: 1,
  a5: 1,
  ak: 1,
  aj: 1,
  a: 1
}));
function $isArrayOf_sci_WrappedString(obj, depth) {
  return (!(!(((obj && obj.$classData) && (obj.$classData.D === depth)) && obj.$classData.B.n.d8)));
}
/** @constructor */
function $c_sjsr_WrappedVarArgs(array) {
  this.em = null;
  this.em = array;
}
$p = $c_sjsr_WrappedVarArgs.prototype = new $h_O();
$p.constructor = $c_sjsr_WrappedVarArgs;
/** @constructor */
function $h_sjsr_WrappedVarArgs() {
}
$h_sjsr_WrappedVarArgs.prototype = $p;
$p.cb = (function(f) {
  return $f_sc_StrictOptimizedIterableOps__map__F1__O(this, f);
});
$p.f6 = (function(that) {
  return $f_sci_IndexedSeq__canEqual__O__Z(this, that);
});
$p.e7 = (function(o) {
  return $f_sci_IndexedSeq__sameElements__sc_IterableOnce__Z(this, o);
});
$p.f5 = (function() {
  return $m_sci_IndexedSeqDefaults$().fG;
});
$p.k = (function() {
  return $ct_sc_IndexedSeqView$IndexedSeqViewIterator__sc_IndexedSeqView__(new $c_sc_IndexedSeqView$IndexedSeqViewIterator(), new $c_sc_IndexedSeqView$Id(this));
});
$p.aZ = (function(n) {
  return $f_sc_IndexedSeqOps__drop__I__O(this, n);
});
$p.w = (function() {
  return $f_sc_IndexedSeqOps__head__O(this);
});
$p.bw = (function(len) {
  var x = this.p();
  return ((x === len) ? 0 : ((x < len) ? (-1) : 1));
});
$p.r = (function() {
  return this.p();
});
$p.P = (function(o) {
  return $f_sc_Seq__equals__O__Z(this, o);
});
$p.S = (function() {
  return $m_s_util_hashing_MurmurHash3$().gx(this);
});
$p.A = (function() {
  return $f_sc_Iterable__toString__T(this);
});
$p.l = (function() {
  return $f_sc_SeqOps__isEmpty__Z(this);
});
$p.F = (function() {
  return $f_sc_IterableOps__tail__O(this);
});
$p.dl = (function(f) {
  $f_sc_IterableOnceOps__foreach__F1__V(this, f);
});
$p.c9 = (function(dest, start, n) {
  return $f_sc_IterableOnceOps__copyToArray__O__I__I__I(this, dest, start, n);
});
$p.dV = (function(b, start, sep, end) {
  return $f_sc_IterableOnceOps__addString__scm_StringBuilder__T__T__T__scm_StringBuilder(this, b, start, sep, end);
});
$p.dq = (function() {
  return $m_sjsr_WrappedVarArgs$();
});
$p.p = (function() {
  return (this.em.length | 0);
});
$p.x = (function(idx) {
  return this.em[idx];
});
$p.c7 = (function() {
  return "WrappedVarArgs";
});
$p.dm = (function(coll) {
  return $m_sjsr_WrappedVarArgs$().gj(coll);
});
$p.f = (function(v1) {
  return this.x((v1 | 0));
});
$p.bv = (function() {
  return $m_sjsr_WrappedVarArgs$();
});
function $isArrayOf_sjsr_WrappedVarArgs(obj, depth) {
  return (!(!(((obj && obj.$classData) && (obj.$classData.D === depth)) && obj.$classData.B.n.b3)));
}
var $d_sjsr_WrappedVarArgs = new $TypeData().i($c_sjsr_WrappedVarArgs, "scala.scalajs.runtime.WrappedVarArgs", ({
  b3: 1,
  J: 1,
  b: 1,
  c: 1,
  g: 1,
  f: 1,
  e: 1,
  l: 1,
  i: 1,
  j: 1,
  k: 1,
  d: 1,
  p: 1,
  D: 1,
  z: 1,
  s: 1,
  w: 1,
  P: 1,
  K: 1,
  o: 1,
  y: 1,
  a: 1
}));
/** @constructor */
function $c_sci_HashMap(rootNode) {
  this.aI = null;
  this.aI = rootNode;
}
$p = $c_sci_HashMap.prototype = new $h_sci_AbstractMap();
$p.constructor = $c_sci_HashMap;
/** @constructor */
function $h_sci_HashMap() {
}
$h_sci_HashMap.prototype = $p;
$p.e4 = (function() {
  return $m_sci_HashMap$();
});
$p.r = (function() {
  return this.aI.an;
});
$p.ay = (function() {
  return this.aI.an;
});
$p.l = (function() {
  return (this.aI.an === 0);
});
$p.k = (function() {
  return (this.l() ? $m_sc_Iterator$().ab : new $c_sci_MapKeyValueTupleIterator(this.aI));
});
$p.cK = (function(key) {
  var keyUnimprovedHash = $m_sr_Statics$().aj(key);
  var keyHash = $m_sc_Hashing$().b9(keyUnimprovedHash);
  return this.aI.ev(key, keyUnimprovedHash, keyHash, 0);
});
$p.f = (function(key) {
  var keyUnimprovedHash = $m_sr_Statics$().aj(key);
  var keyHash = $m_sc_Hashing$().b9(keyUnimprovedHash);
  return this.aI.f4(key, keyUnimprovedHash, keyHash, 0);
});
$p.ca = (function(key) {
  var keyUnimprovedHash = $m_sr_Statics$().aj(key);
  var keyHash = $m_sc_Hashing$().b9(keyUnimprovedHash);
  return this.aI.eA(key, keyUnimprovedHash, keyHash, 0);
});
$p.cN = (function(key, default$1) {
  var keyUnimprovedHash = $m_sr_Statics$().aj(key);
  var keyHash = $m_sc_Hashing$().b9(keyUnimprovedHash);
  return this.aI.fd(key, keyUnimprovedHash, keyHash, 0, default$1);
});
$p.ds = (function(key, value) {
  var keyUnimprovedHash = $m_sr_Statics$().aj(key);
  var newRootNode = this.aI.gC(key, value, keyUnimprovedHash, $m_sc_Hashing$().b9(keyUnimprovedHash), 0, true);
  return ((newRootNode === this.aI) ? this : new $c_sci_HashMap(newRootNode));
});
$p.i4 = (function(key) {
  var keyUnimprovedHash = $m_sr_Statics$().aj(key);
  var newRootNode = this.aI.gr(key, keyUnimprovedHash, $m_sc_Hashing$().b9(keyUnimprovedHash), 0);
  return ((newRootNode === this.aI) ? this : new $c_sci_HashMap(newRootNode));
});
$p.ik = (function() {
  return this.i4(this.k().g().az);
});
$p.d0 = (function(f) {
  this.aI.d0(f);
});
$p.P = (function(that) {
  if ((that instanceof $c_sci_HashMap)) {
    if ((this === that)) {
      return true;
    } else {
      var x = this.aI;
      var x$2 = that.aI;
      return ((x === null) ? (x$2 === null) : x.P(x$2));
    }
  } else {
    return $f_sc_Map__equals__O__Z(this, that);
  }
});
$p.S = (function() {
  if (this.l()) {
    return $m_s_util_hashing_MurmurHash3$().f2;
  } else {
    var hashIterator = new $c_sci_MapKeyValueTupleHashIterator(this.aI);
    return $m_s_util_hashing_MurmurHash3$().gB(hashIterator, $m_s_util_hashing_MurmurHash3$().cG);
  }
});
$p.c7 = (function() {
  return "HashMap";
});
$p.aa = (function(key, value) {
  return this.ds(key, value);
});
$p.F = (function() {
  return this.ik();
});
$p.w = (function() {
  return this.k().g();
});
$p.aZ = (function(n) {
  return $f_sc_IterableOps__drop__I__O(this, n);
});
function $isArrayOf_sci_HashMap(obj, depth) {
  return (!(!(((obj && obj.$classData) && (obj.$classData.D === depth)) && obj.$classData.B.n.aP)));
}
var $d_sci_HashMap = new $TypeData().i($c_sci_HashMap, "scala.collection.immutable.HashMap", ({
  aP: 1,
  W: 1,
  T: 1,
  h: 1,
  b: 1,
  c: 1,
  g: 1,
  f: 1,
  e: 1,
  i: 1,
  j: 1,
  V: 1,
  U: 1,
  d: 1,
  M: 1,
  l: 1,
  Y: 1,
  N: 1,
  o: 1,
  cd: 1,
  cU: 1,
  a: 1,
  A: 1
}));
function $isArrayOf_sci_TreeSeqMap(obj, depth) {
  return (!(!(((obj && obj.$classData) && (obj.$classData.D === depth)) && obj.$classData.B.n.cV)));
}
function $isArrayOf_sci_VectorMap(obj, depth) {
  return (!(!(((obj && obj.$classData) && (obj.$classData.D === depth)) && obj.$classData.B.n.d5)));
}
/** @constructor */
function $c_scm_AbstractBuffer() {
}
$p = $c_scm_AbstractBuffer.prototype = new $h_scm_AbstractSeq();
$p.constructor = $c_scm_AbstractBuffer;
/** @constructor */
function $h_scm_AbstractBuffer() {
}
$h_scm_AbstractBuffer.prototype = $p;
$p.b7 = (function(elems) {
  return $f_scm_Growable__addAll__sc_IterableOnce__scm_Growable(this, elems);
});
function $isArrayOf_sci_ListMap(obj, depth) {
  return (!(!(((obj && obj.$classData) && (obj.$classData.D === depth)) && obj.$classData.B.n.cy)));
}
function $ct_sci_Vector__AO__($thiz, prefix1) {
  $thiz.b = prefix1;
  return $thiz;
}
/** @constructor */
function $c_sci_Vector() {
  this.b = null;
}
$p = $c_sci_Vector.prototype = new $h_sci_AbstractSeq();
$p.constructor = $c_sci_Vector;
/** @constructor */
function $h_sci_Vector() {
}
$h_sci_Vector.prototype = $p;
$p.bw = (function(len) {
  var x = this.p();
  return ((x === len) ? 0 : ((x < len) ? (-1) : 1));
});
$p.r = (function() {
  return this.p();
});
$p.bl = (function() {
  return "IndexedSeq";
});
$p.f6 = (function(that) {
  return $f_sci_IndexedSeq__canEqual__O__Z(this, that);
});
$p.e7 = (function(o) {
  return $f_sci_IndexedSeq__sameElements__sc_IterableOnce__Z(this, o);
});
$p.dq = (function() {
  return $m_sci_Vector$();
});
$p.p = (function() {
  return ((this instanceof $c_sci_BigVector) ? this.e : this.b.a.length);
});
$p.k = (function() {
  return ((this === $m_sci_Vector0$()) ? $m_sci_Vector$().fM : new $c_sci_NewVectorIterator(this, this.p(), this.bY()));
});
$p.hm = (function(pred, isFlipped) {
  var i = 0;
  var len = this.b.a.length;
  while ((i !== len)) {
    if (((!(!pred.f(this.b.a[i]))) === isFlipped)) {
      var bitmap = 0;
      var j = ((1 + i) | 0);
      while ((j < len)) {
        if (((!(!pred.f(this.b.a[j]))) !== isFlipped)) {
          bitmap = (bitmap | (1 << j));
        }
        j = ((1 + j) | 0);
      }
      var newLen = ((i + $m_jl_Integer$().bS(bitmap)) | 0);
      if ((this instanceof $c_sci_BigVector)) {
        var b = new $c_sci_VectorBuilder();
        var k = 0;
        while ((k < i)) {
          b.dU(this.b.a[k]);
          k = ((1 + k) | 0);
        }
        k = ((1 + i) | 0);
        while ((i !== newLen)) {
          if ((((1 << k) & bitmap) !== 0)) {
            b.dU(this.b.a[k]);
            i = ((1 + i) | 0);
          }
          k = ((1 + k) | 0);
        }
        this.ge(new $c_sr_AbstractFunction1_$$Lambda$7afc3dd0acc1681fb022ef921c83979087aaa919(((pred, isFlipped, b) => ((v$3) => {
          if (((!(!pred.f(v$3))) !== isFlipped)) {
            b.dU(v$3);
          }
        }))(pred, isFlipped, b)));
        return b.cc();
      } else {
        if ((newLen === 0)) {
          return $m_sci_Vector0$();
        }
        var newData = new $ac_O(newLen);
        var src = this.b;
        var length = i;
        src.j(0, newData, 0, length);
        var k$2 = ((1 + i) | 0);
        while ((i !== newLen)) {
          if ((((1 << k$2) & bitmap) !== 0)) {
            newData.a[i] = this.b.a[k$2];
            i = ((1 + i) | 0);
          }
          k$2 = ((1 + k$2) | 0);
        }
        return new $c_sci_Vector1(newData);
      }
    }
    i = ((1 + i) | 0);
  }
  if ((this instanceof $c_sci_BigVector)) {
    var b$2 = new $c_sci_VectorBuilder();
    b$2.hA(this.b);
    this.ge(new $c_sr_AbstractFunction1_$$Lambda$7afc3dd0acc1681fb022ef921c83979087aaa919(((v$3$1) => {
      if (((!(!pred.f(v$3$1))) !== isFlipped)) {
        b$2.dU(v$3$1);
      }
    })));
    return b$2.cc();
  } else {
    return this;
  }
});
$p.c7 = (function() {
  return "Vector";
});
$p.c9 = (function(xs, start, len) {
  return this.k().c9(xs, start, len);
});
$p.f5 = (function() {
  return $m_sci_Vector$().fL;
});
$p.ax = (function(index) {
  return $m_scg_CommonErrors$().fg(index, ((this.p() - 1) | 0));
});
$p.w = (function() {
  if ((this.b.a.length === 0)) {
    throw new $c_ju_NoSuchElementException("empty.head");
  } else {
    return this.b.a[0];
  }
});
$p.dl = (function(f) {
  var c = this.bY();
  var i = 0;
  while ((i < c)) {
    var $x_1 = $m_sci_VectorStatics$();
    var idx = i;
    var c$1 = (((c + ((c >>> 31) | 0)) | 0) >> 1);
    var a = ((idx - c$1) | 0);
    var sign = (a >> 31);
    $x_1.ey(((((((1 + c$1) | 0) - (((a ^ sign) - sign) | 0)) | 0) - 1) | 0), this.bX(i), f);
    i = ((1 + i) | 0);
  }
});
$p.bv = (function() {
  return $m_sci_Vector$();
});
$p.aZ = (function(n) {
  return this.ie(n, this.p());
});
function $isArrayOf_sci_Vector(obj, depth) {
  return (!(!(((obj && obj.$classData) && (obj.$classData.D === depth)) && obj.$classData.B.n.Q)));
}
function $isArrayOf_sci_ArraySeq$ofRef(obj, depth) {
  return (!(!(((obj && obj.$classData) && (obj.$classData.D === depth)) && obj.$classData.B.n.cj)));
}
function $p_sci_List__loop$2__I__I__sci_List__I($thiz, len$1, i, xs) {
  var xs$tailLocal1 = xs;
  var i$tailLocal1 = i;
  while (true) {
    if ((i$tailLocal1 === len$1)) {
      return ((!xs$tailLocal1.l()) | 0);
    } else {
      if ((!xs$tailLocal1.l())) {
        var i$tailLocal1$tmp1 = ((1 + i$tailLocal1) | 0);
        var xs$tailLocal1$tmp1 = xs$tailLocal1.F();
        i$tailLocal1 = i$tailLocal1$tmp1;
        xs$tailLocal1 = xs$tailLocal1$tmp1;
        continue;
      }
      return (-1);
    }
  }
}
function $p_sci_List__listEq$1__sci_List__sci_List__Z($thiz, a, b) {
  var b$tailLocal1 = b;
  var a$tailLocal1 = a;
  while (true) {
    if ((a$tailLocal1 === b$tailLocal1)) {
      return true;
    } else {
      var aEmpty = a$tailLocal1.l();
      var bEmpty = b$tailLocal1.l();
      if (((!(aEmpty || bEmpty)) && $m_sr_BoxesRunTime$().h(a$tailLocal1.w(), b$tailLocal1.w()))) {
        var a$tailLocal1$tmp1 = a$tailLocal1.F();
        var b$tailLocal1$tmp1 = b$tailLocal1.F();
        a$tailLocal1 = a$tailLocal1$tmp1;
        b$tailLocal1 = b$tailLocal1$tmp1;
        continue;
      }
      return (aEmpty && bEmpty);
    }
  }
}
/** @constructor */
function $c_sci_List() {
}
$p = $c_sci_List.prototype = new $h_sci_AbstractSeq();
$p.constructor = $c_sci_List;
/** @constructor */
function $h_sci_List() {
}
$h_sci_List.prototype = $p;
$p.x = (function(n) {
  return $f_sc_LinearSeqOps__apply__I__O(this, n);
});
$p.e7 = (function(that) {
  return $f_sc_LinearSeqOps__sameElements__sc_IterableOnce__Z(this, that);
});
$p.bl = (function() {
  return "LinearSeq";
});
$p.k = (function() {
  return new $c_sc_StrictOptimizedLinearSeqOps$$anon$1(this);
});
$p.dq = (function() {
  return $m_sci_List$();
});
$p.gH = (function(prefix) {
  if (this.l()) {
    return prefix;
  } else if (prefix.l()) {
    return this;
  } else {
    var result = new $c_sci_$colon$colon(prefix.w(), this);
    var curr = result;
    var that = prefix.F();
    while ((!that.l())) {
      var temp = new $c_sci_$colon$colon(that.w(), this);
      curr.bZ = temp;
      curr = temp;
      that = that.F();
    }
    return result;
  }
});
$p.l = (function() {
  return (this === $m_sci_Nil$());
});
$p.hZ = (function(prefix) {
  if ((prefix instanceof $c_sci_List)) {
    return this.gH(prefix);
  }
  if ((prefix.r() === 0)) {
    return this;
  }
  if ((prefix instanceof $c_scm_ListBuffer)) {
    if (this.l()) {
      return prefix.gy();
    }
  }
  var iter = prefix.k();
  if (iter.m()) {
    var result = new $c_sci_$colon$colon(iter.g(), this);
    var curr = result;
    while (iter.m()) {
      var temp = new $c_sci_$colon$colon(iter.g(), this);
      curr.bZ = temp;
      curr = temp;
    }
    return result;
  } else {
    return this;
  }
});
$p.hI = (function(f) {
  if ((this === $m_sci_Nil$())) {
    var $x_1 = $m_sci_Nil$();
  } else {
    var h = new $c_sci_$colon$colon(f.f(this.w()), $m_sci_Nil$());
    var t = h;
    var rest = this.F();
    while ((rest !== $m_sci_Nil$())) {
      var nx = new $c_sci_$colon$colon(f.f(rest.w()), $m_sci_Nil$());
      t.bZ = nx;
      t = nx;
      rest = rest.F();
    }
    var $x_1 = h;
  }
  return $x_1;
});
$p.dl = (function(f) {
  var these = this;
  while ((!these.l())) {
    f.f(these.w());
    these = these.F();
  }
});
$p.p = (function() {
  var these = this;
  var len = 0;
  while ((!these.l())) {
    len = ((1 + len) | 0);
    these = these.F();
  }
  return len;
});
$p.bw = (function(len) {
  return ((len < 0) ? 1 : $p_sci_List__loop$2__I__I__sci_List__I(this, len, 0, this));
});
$p.c7 = (function() {
  return "List";
});
$p.P = (function(o) {
  return ((o instanceof $c_sci_List) ? $p_sci_List__listEq$1__sci_List__sci_List__Z(this, this, o) : $f_sc_Seq__equals__O__Z(this, o));
});
$p.bv = (function() {
  return $m_sci_List$();
});
$p.cb = (function(f) {
  return this.hI(f);
});
$p.aZ = (function(n) {
  return $p_sc_StrictOptimizedLinearSeqOps__loop$2__I__sc_LinearSeq__sc_LinearSeq(this, n, this);
});
$p.f = (function(v1) {
  return $f_sc_LinearSeqOps__apply__I__O(this, (v1 | 0));
});
function $isArrayOf_sci_List(obj, depth) {
  return (!(!(((obj && obj.$classData) && (obj.$classData.D === depth)) && obj.$classData.B.n.al)));
}
/** @constructor */
function $c_sci_VectorImpl() {
  this.b = null;
}
$p = $c_sci_VectorImpl.prototype = new $h_sci_Vector();
$p.constructor = $c_sci_VectorImpl;
/** @constructor */
function $h_sci_VectorImpl() {
}
$h_sci_VectorImpl.prototype = $p;
$p.ie = (function(from, until) {
  var lo = ((from > 0) ? from : 0);
  var b = this.p();
  var hi = ((until < b) ? until : b);
  return ((hi <= lo) ? $m_sci_Vector0$() : ((((hi - lo) | 0) === this.p()) ? this : this.bL(lo, hi)));
});
function $isArrayOf_scm_ArraySeq$ofChar(obj, depth) {
  return (!(!(((obj && obj.$classData) && (obj.$classData.D === depth)) && obj.$classData.B.n.dc)));
}
function $isArrayOf_scm_HashMap(obj, depth) {
  return (!(!(((obj && obj.$classData) && (obj.$classData.D === depth)) && obj.$classData.B.n.di)));
}
function $ct_sci_BigVector__AO__AO__I__($thiz, _prefix1, suffix1, length0) {
  $thiz.c = suffix1;
  $thiz.e = length0;
  $ct_sci_Vector__AO__($thiz, _prefix1);
  return $thiz;
}
/** @constructor */
function $c_sci_BigVector() {
  this.b = null;
  this.c = null;
  this.e = 0;
}
$p = $c_sci_BigVector.prototype = new $h_sci_VectorImpl();
$p.constructor = $c_sci_BigVector;
/** @constructor */
function $h_sci_BigVector() {
}
$h_sci_BigVector.prototype = $p;
$p.ge = (function(f) {
  var c = this.bY();
  var i = 1;
  while ((i < c)) {
    var $x_1 = $m_sci_VectorStatics$();
    var idx = i;
    var c$1 = (((c + ((c >>> 31) | 0)) | 0) >> 1);
    var a = ((idx - c$1) | 0);
    var sign = (a >> 31);
    $x_1.ey(((((((1 + c$1) | 0) - (((a ^ sign) - sign) | 0)) | 0) - 1) | 0), this.bX(i), f);
    i = ((1 + i) | 0);
  }
});
function $isArrayOf_sci_BigVector(obj, depth) {
  return (!(!(((obj && obj.$classData) && (obj.$classData.D === depth)) && obj.$classData.B.n.X)));
}
/** @constructor */
function $c_sci_Vector1(_data1) {
  this.b = null;
  $ct_sci_Vector__AO__(this, _data1);
}
$p = $c_sci_Vector1.prototype = new $h_sci_VectorImpl();
$p.constructor = $c_sci_Vector1;
/** @constructor */
function $h_sci_Vector1() {
}
$h_sci_Vector1.prototype = $p;
$p.x = (function(index) {
  if (((index >= 0) && (index < this.b.a.length))) {
    return this.b.a[index];
  } else {
    throw this.ax(index);
  }
});
$p.cO = (function(index, elem) {
  if (((index >= 0) && (index < this.b.a.length))) {
    var a1 = this.b;
    var a1c = a1.d();
    a1c.a[index] = elem;
    return new $c_sci_Vector1(a1c);
  } else {
    throw this.ax(index);
  }
});
$p.cI = (function(elem) {
  if ((this.b.a.length < 32)) {
    return new $c_sci_Vector1($m_sci_VectorStatics$().dj(this.b, elem));
  } else {
    var $x_2 = this.b;
    var $x_1 = $m_sci_VectorStatics$().ai;
    var a = new $ac_O(1);
    a.a[0] = elem;
    return new $c_sci_Vector2($x_2, 32, $x_1, a, 33);
  }
});
$p.bU = (function(f) {
  return new $c_sci_Vector1($m_sci_VectorStatics$().bJ(this.b, f));
});
$p.bL = (function(lo, hi) {
  return new $c_sci_Vector1($m_ju_Arrays$().t(this.b, lo, hi));
});
$p.bx = (function() {
  if ((this.b.a.length === 1)) {
    return $m_sci_Vector0$();
  } else {
    var a = this.b;
    return new $c_sci_Vector1($m_ju_Arrays$().t(a, 1, a.a.length));
  }
});
$p.bY = (function() {
  return 1;
});
$p.bX = (function(idx) {
  return this.b;
});
$p.f = (function(v1) {
  var index = (v1 | 0);
  if (((index >= 0) && (index < this.b.a.length))) {
    return this.b.a[index];
  } else {
    throw this.ax(index);
  }
});
$p.cb = (function(f) {
  return this.bU(f);
});
$p.F = (function() {
  return this.bx();
});
var $d_sci_Vector1 = new $TypeData().i($c_sci_Vector1, "scala.collection.immutable.Vector1", ({
  cY: 1,
  Z: 1,
  Q: 1,
  I: 1,
  u: 1,
  h: 1,
  b: 1,
  c: 1,
  g: 1,
  f: 1,
  e: 1,
  i: 1,
  j: 1,
  k: 1,
  d: 1,
  p: 1,
  l: 1,
  D: 1,
  z: 1,
  s: 1,
  w: 1,
  P: 1,
  J: 1,
  o: 1,
  y: 1,
  K: 1,
  a: 1,
  A: 1
}));
/** @constructor */
function $c_sci_$colon$colon(head, next) {
  this.ed = null;
  this.bZ = null;
  this.ed = head;
  this.bZ = next;
}
$p = $c_sci_$colon$colon.prototype = new $h_sci_List();
$p.constructor = $c_sci_$colon$colon;
/** @constructor */
function $h_sci_$colon$colon() {
}
$h_sci_$colon$colon.prototype = $p;
$p.bK = (function() {
  return new $c_s_Product$$anon$1(this);
});
$p.bb = (function() {
  return 2;
});
$p.bd = (function() {
  return "::";
});
$p.bc = (function(n) {
  if ((n === 0)) {
    return this.ed;
  }
  if ((n === 1)) {
    return this.bZ;
  }
  throw $ct_jl_IndexOutOfBoundsException__T__(new $c_jl_IndexOutOfBoundsException(), ("" + n));
});
$p.w = (function() {
  return this.ed;
});
$p.dn = (function() {
  return new $c_s_Some(this.ed);
});
$p.F = (function() {
  return this.bZ;
});
var $d_sci_$colon$colon = new $TypeData().i($c_sci_$colon$colon, "scala.collection.immutable.$colon$colon", ({
  ci: 1,
  al: 1,
  I: 1,
  u: 1,
  h: 1,
  b: 1,
  c: 1,
  g: 1,
  f: 1,
  e: 1,
  i: 1,
  j: 1,
  k: 1,
  d: 1,
  p: 1,
  l: 1,
  D: 1,
  z: 1,
  af: 1,
  a5: 1,
  ak: 1,
  aj: 1,
  o: 1,
  y: 1,
  aL: 1,
  K: 1,
  a: 1,
  A: 1,
  v: 1
}));
/** @constructor */
function $c_sci_Nil$() {
  $n_sci_Nil$ = this;
  var _1 = $m_sci_Nil$();
  $m_sci_Nil$();
}
$p = $c_sci_Nil$.prototype = new $h_sci_List();
$p.constructor = $c_sci_Nil$;
/** @constructor */
function $h_sci_Nil$() {
}
$h_sci_Nil$.prototype = $p;
$p.bK = (function() {
  return new $c_s_Product$$anon$1(this);
});
$p.bb = (function() {
  return 0;
});
$p.bd = (function() {
  return "Nil";
});
$p.bc = (function(n) {
  throw $ct_jl_IndexOutOfBoundsException__T__(new $c_jl_IndexOutOfBoundsException(), ("" + n));
});
$p.hu = (function() {
  throw new $c_ju_NoSuchElementException("head of empty list");
});
$p.ij = (function() {
  throw $ct_jl_UnsupportedOperationException__T__(new $c_jl_UnsupportedOperationException(), "tail of empty list");
});
$p.r = (function() {
  return 0;
});
$p.k = (function() {
  return $m_sc_Iterator$().ab;
});
$p.w = (function() {
  this.hu();
});
$p.dn = (function() {
  return $m_s_None$();
});
$p.F = (function() {
  this.ij();
});
var $d_sci_Nil$ = new $TypeData().i($c_sci_Nil$, "scala.collection.immutable.Nil$", ({
  cN: 1,
  al: 1,
  I: 1,
  u: 1,
  h: 1,
  b: 1,
  c: 1,
  g: 1,
  f: 1,
  e: 1,
  i: 1,
  j: 1,
  k: 1,
  d: 1,
  p: 1,
  l: 1,
  D: 1,
  z: 1,
  af: 1,
  a5: 1,
  ak: 1,
  aj: 1,
  o: 1,
  y: 1,
  aL: 1,
  K: 1,
  a: 1,
  A: 1,
  v: 1
}));
var $n_sci_Nil$;
function $m_sci_Nil$() {
  if ((!$n_sci_Nil$)) {
    $n_sci_Nil$ = new $c_sci_Nil$();
  }
  return $n_sci_Nil$;
}
/** @constructor */
function $c_sci_Vector0$() {
  this.b = null;
  this.c = null;
  this.e = 0;
  $ct_sci_BigVector__AO__AO__I__(this, $m_sci_VectorStatics$().eW, $m_sci_VectorStatics$().eW, 0);
}
$p = $c_sci_Vector0$.prototype = new $h_sci_BigVector();
$p.constructor = $c_sci_Vector0$;
/** @constructor */
function $h_sci_Vector0$() {
}
$h_sci_Vector0$.prototype = $p;
$p.g4 = (function(index) {
  throw this.ax(index);
});
$p.cO = (function(index, elem) {
  throw this.ax(index);
});
$p.cI = (function(elem) {
  var a = new $ac_O(1);
  a.a[0] = elem;
  return new $c_sci_Vector1(a);
});
$p.bx = (function() {
  throw $ct_jl_UnsupportedOperationException__T__(new $c_jl_UnsupportedOperationException(), "empty.tail");
});
$p.bL = (function(lo, hi) {
  return this;
});
$p.bY = (function() {
  return 0;
});
$p.bX = (function(idx) {
  return null;
});
$p.P = (function(o) {
  return ((this === o) || ((o instanceof $c_sci_Vector) ? false : $f_sc_Seq__equals__O__Z(this, o)));
});
$p.ax = (function(index) {
  return $ct_jl_IndexOutOfBoundsException__T__(new $c_jl_IndexOutOfBoundsException(), (index + " is out of bounds (empty vector)"));
});
$p.x = (function(i) {
  this.g4(i);
});
$p.f = (function(v1) {
  this.g4((v1 | 0));
});
$p.cb = (function(f) {
  return this;
});
$p.F = (function() {
  return this.bx();
});
var $d_sci_Vector0$ = new $TypeData().i($c_sci_Vector0$, "scala.collection.immutable.Vector0$", ({
  cX: 1,
  X: 1,
  Z: 1,
  Q: 1,
  I: 1,
  u: 1,
  h: 1,
  b: 1,
  c: 1,
  g: 1,
  f: 1,
  e: 1,
  i: 1,
  j: 1,
  k: 1,
  d: 1,
  p: 1,
  l: 1,
  D: 1,
  z: 1,
  s: 1,
  w: 1,
  P: 1,
  J: 1,
  o: 1,
  y: 1,
  K: 1,
  a: 1,
  A: 1
}));
var $n_sci_Vector0$;
function $m_sci_Vector0$() {
  if ((!$n_sci_Vector0$)) {
    $n_sci_Vector0$ = new $c_sci_Vector0$();
  }
  return $n_sci_Vector0$;
}
/** @constructor */
function $c_sci_Vector2(_prefix1, len1, data2, _suffix1, _length0) {
  this.b = null;
  this.c = null;
  this.e = 0;
  this.aW = 0;
  this.aJ = null;
  this.aW = len1;
  this.aJ = data2;
  $ct_sci_BigVector__AO__AO__I__(this, _prefix1, _suffix1, _length0);
}
$p = $c_sci_Vector2.prototype = new $h_sci_BigVector();
$p.constructor = $c_sci_Vector2;
/** @constructor */
function $h_sci_Vector2() {
}
$h_sci_Vector2.prototype = $p;
$p.x = (function(index) {
  if (((index >= 0) && (index < this.e))) {
    var io = ((index - this.aW) | 0);
    if ((io >= 0)) {
      var i2 = ((io >>> 5) | 0);
      var i1 = (31 & io);
      return ((i2 < this.aJ.a.length) ? this.aJ.a[i2].a[i1] : this.c.a[(31 & io)]);
    } else {
      return this.b.a[index];
    }
  } else {
    throw this.ax(index);
  }
});
$p.cO = (function(index, elem) {
  if (((index >= 0) && (index < this.e))) {
    if ((index >= this.aW)) {
      var io = ((index - this.aW) | 0);
      var i2 = ((io >>> 5) | 0);
      var i1 = (31 & io);
      if ((i2 < this.aJ.a.length)) {
        var a2 = this.aJ;
        var a2c = a2.d();
        var a1 = a2c.a[i2];
        var a1c = a1.d();
        a1c.a[i1] = elem;
        a2c.a[i2] = a1c;
        return new $c_sci_Vector2(this.b, this.aW, a2c, this.c, this.e);
      } else {
        var a1$1 = this.c;
        var a1c$1 = a1$1.d();
        a1c$1.a[i1] = elem;
        return new $c_sci_Vector2(this.b, this.aW, this.aJ, a1c$1, this.e);
      }
    } else {
      var a1$2 = this.b;
      var a1c$2 = a1$2.d();
      a1c$2.a[index] = elem;
      return new $c_sci_Vector2(a1c$2, this.aW, this.aJ, this.c, this.e);
    }
  } else {
    throw this.ax(index);
  }
});
$p.cI = (function(elem) {
  if ((this.c.a.length < 32)) {
    var suffix1$3 = $m_sci_VectorStatics$().dj(this.c, elem);
    var length0$3 = ((1 + this.e) | 0);
    return new $c_sci_Vector2(this.b, this.aW, this.aJ, suffix1$3, length0$3);
  } else if ((this.aJ.a.length < 30)) {
    var data2$4 = $m_sci_VectorStatics$().s(this.aJ, this.c);
    var a = new $ac_O(1);
    a.a[0] = elem;
    var length0$4 = ((1 + this.e) | 0);
    return new $c_sci_Vector2(this.b, this.aW, data2$4, a, length0$4);
  } else {
    var $x_5 = this.b;
    var $x_4 = this.aW;
    var $x_3 = this.aJ;
    var $x_2 = this.aW;
    var $x_1 = $m_sci_VectorStatics$().aR;
    var x = this.c;
    var a$1 = new ($d_O.r().r().C)(1);
    a$1.a[0] = x;
    var a$2 = new $ac_O(1);
    a$2.a[0] = elem;
    return new $c_sci_Vector3($x_5, $x_4, $x_3, ((960 + $x_2) | 0), $x_1, a$1, a$2, ((1 + this.e) | 0));
  }
});
$p.bU = (function(f) {
  var prefix1$7 = $m_sci_VectorStatics$().bJ(this.b, f);
  var data2$7 = $m_sci_VectorStatics$().Y(2, this.aJ, f);
  var suffix1$7 = $m_sci_VectorStatics$().bJ(this.c, f);
  return new $c_sci_Vector2(prefix1$7, this.aW, data2$7, suffix1$7, this.e);
});
$p.bL = (function(lo, hi) {
  var b = new $c_sci_VectorSliceBuilder(lo, hi);
  b.E(1, this.b);
  b.E(2, this.aJ);
  b.E(1, this.c);
  return b.cc();
});
$p.bx = (function() {
  if ((this.aW > 1)) {
    var a = this.b;
    var prefix1$8 = $m_ju_Arrays$().t(a, 1, a.a.length);
    var len1$7 = ((this.aW - 1) | 0);
    var length0$8 = ((this.e - 1) | 0);
    return new $c_sci_Vector2(prefix1$8, len1$7, this.aJ, this.c, length0$8);
  } else {
    return this.bL(1, this.e);
  }
});
$p.bY = (function() {
  return 3;
});
$p.bX = (function(idx) {
  switch (idx) {
    case 0: {
      return this.b;
      break;
    }
    case 1: {
      return this.aJ;
      break;
    }
    case 2: {
      return this.c;
      break;
    }
    default: {
      throw new $c_s_MatchError(idx);
    }
  }
});
$p.f = (function(v1) {
  var index = (v1 | 0);
  if (((index >= 0) && (index < this.e))) {
    var io = ((index - this.aW) | 0);
    if ((io >= 0)) {
      var i2 = ((io >>> 5) | 0);
      var i1 = (31 & io);
      return ((i2 < this.aJ.a.length) ? this.aJ.a[i2].a[i1] : this.c.a[(31 & io)]);
    } else {
      return this.b.a[index];
    }
  } else {
    throw this.ax(index);
  }
});
$p.cb = (function(f) {
  return this.bU(f);
});
$p.F = (function() {
  return this.bx();
});
var $d_sci_Vector2 = new $TypeData().i($c_sci_Vector2, "scala.collection.immutable.Vector2", ({
  cZ: 1,
  X: 1,
  Z: 1,
  Q: 1,
  I: 1,
  u: 1,
  h: 1,
  b: 1,
  c: 1,
  g: 1,
  f: 1,
  e: 1,
  i: 1,
  j: 1,
  k: 1,
  d: 1,
  p: 1,
  l: 1,
  D: 1,
  z: 1,
  s: 1,
  w: 1,
  P: 1,
  J: 1,
  o: 1,
  y: 1,
  K: 1,
  a: 1,
  A: 1
}));
/** @constructor */
function $c_sci_Vector3(_prefix1, len1, prefix2, len12, data3, suffix2, _suffix1, _length0) {
  this.b = null;
  this.c = null;
  this.e = 0;
  this.aG = 0;
  this.aQ = null;
  this.aK = 0;
  this.ar = null;
  this.as = null;
  this.aG = len1;
  this.aQ = prefix2;
  this.aK = len12;
  this.ar = data3;
  this.as = suffix2;
  $ct_sci_BigVector__AO__AO__I__(this, _prefix1, _suffix1, _length0);
}
$p = $c_sci_Vector3.prototype = new $h_sci_BigVector();
$p.constructor = $c_sci_Vector3;
/** @constructor */
function $h_sci_Vector3() {
}
$h_sci_Vector3.prototype = $p;
$p.x = (function(index) {
  if (((index >= 0) && (index < this.e))) {
    var io = ((index - this.aK) | 0);
    if ((io >= 0)) {
      var i3 = ((io >>> 10) | 0);
      var i2 = (31 & ((io >>> 5) | 0));
      var i1 = (31 & io);
      return ((i3 < this.ar.a.length) ? this.ar.a[i3].a[i2].a[i1] : ((i2 < this.as.a.length) ? this.as.a[i2].a[i1] : this.c.a[i1]));
    } else if ((index >= this.aG)) {
      var io$2 = ((index - this.aG) | 0);
      return this.aQ.a[((io$2 >>> 5) | 0)].a[(31 & io$2)];
    } else {
      return this.b.a[index];
    }
  } else {
    throw this.ax(index);
  }
});
$p.cO = (function(index, elem) {
  if (((index >= 0) && (index < this.e))) {
    if ((index >= this.aK)) {
      var io = ((index - this.aK) | 0);
      var i3 = ((io >>> 10) | 0);
      var i2 = (31 & ((io >>> 5) | 0));
      var i1 = (31 & io);
      if ((i3 < this.ar.a.length)) {
        var a3 = this.ar;
        var a3c = a3.d();
        var a2 = a3c.a[i3];
        var a2c = a2.d();
        var a1 = a2c.a[i2];
        var a1c = a1.d();
        a1c.a[i1] = elem;
        a2c.a[i2] = a1c;
        a3c.a[i3] = a2c;
        return new $c_sci_Vector3(this.b, this.aG, this.aQ, this.aK, a3c, this.as, this.c, this.e);
      } else if ((i2 < this.as.a.length)) {
        var a2$1 = this.as;
        var a2c$1 = a2$1.d();
        var a1$1 = a2c$1.a[i2];
        var a1c$1 = a1$1.d();
        a1c$1.a[i1] = elem;
        a2c$1.a[i2] = a1c$1;
        return new $c_sci_Vector3(this.b, this.aG, this.aQ, this.aK, this.ar, a2c$1, this.c, this.e);
      } else {
        var a1$2 = this.c;
        var a1c$2 = a1$2.d();
        a1c$2.a[i1] = elem;
        return new $c_sci_Vector3(this.b, this.aG, this.aQ, this.aK, this.ar, this.as, a1c$2, this.e);
      }
    } else if ((index >= this.aG)) {
      var io$2 = ((index - this.aG) | 0);
      var a2$2 = this.aQ;
      var idx2 = ((io$2 >>> 5) | 0);
      var idx1 = (31 & io$2);
      var a2c$2 = a2$2.d();
      var a1$3 = a2c$2.a[idx2];
      var a1c$3 = a1$3.d();
      a1c$3.a[idx1] = elem;
      a2c$2.a[idx2] = a1c$3;
      return new $c_sci_Vector3(this.b, this.aG, a2c$2, this.aK, this.ar, this.as, this.c, this.e);
    } else {
      var a1$4 = this.b;
      var a1c$4 = a1$4.d();
      a1c$4.a[index] = elem;
      return new $c_sci_Vector3(a1c$4, this.aG, this.aQ, this.aK, this.ar, this.as, this.c, this.e);
    }
  } else {
    throw this.ax(index);
  }
});
$p.cI = (function(elem) {
  if ((this.c.a.length < 32)) {
    var suffix1$16 = $m_sci_VectorStatics$().dj(this.c, elem);
    var length0$16 = ((1 + this.e) | 0);
    return new $c_sci_Vector3(this.b, this.aG, this.aQ, this.aK, this.ar, this.as, suffix1$16, length0$16);
  } else if ((this.as.a.length < 31)) {
    var suffix2$6 = $m_sci_VectorStatics$().s(this.as, this.c);
    var a = new $ac_O(1);
    a.a[0] = elem;
    var length0$17 = ((1 + this.e) | 0);
    return new $c_sci_Vector3(this.b, this.aG, this.aQ, this.aK, this.ar, suffix2$6, a, length0$17);
  } else if ((this.ar.a.length < 30)) {
    var data3$7 = $m_sci_VectorStatics$().s(this.ar, $m_sci_VectorStatics$().s(this.as, this.c));
    var a$1 = new $ac_O(1);
    a$1.a[0] = elem;
    var length0$18 = ((1 + this.e) | 0);
    return new $c_sci_Vector3(this.b, this.aG, this.aQ, this.aK, data3$7, $m_sci_VectorStatics$().ai, a$1, length0$18);
  } else {
    var $x_8 = this.b;
    var $x_7 = this.aG;
    var $x_6 = this.aQ;
    var $x_5 = this.aK;
    var $x_4 = this.ar;
    var $x_3 = this.aK;
    var $x_2 = $m_sci_VectorStatics$().bP;
    var x = $m_sci_VectorStatics$().s(this.as, this.c);
    var a$2 = new ($d_O.r().r().r().C)(1);
    a$2.a[0] = x;
    var $x_1 = $m_sci_VectorStatics$().ai;
    var a$3 = new $ac_O(1);
    a$3.a[0] = elem;
    return new $c_sci_Vector4($x_8, $x_7, $x_6, $x_5, $x_4, ((30720 + $x_3) | 0), $x_2, a$2, $x_1, a$3, ((1 + this.e) | 0));
  }
});
$p.bU = (function(f) {
  var prefix1$21 = $m_sci_VectorStatics$().bJ(this.b, f);
  var prefix2$10 = $m_sci_VectorStatics$().Y(2, this.aQ, f);
  var data3$11 = $m_sci_VectorStatics$().Y(3, this.ar, f);
  var suffix2$10 = $m_sci_VectorStatics$().Y(2, this.as, f);
  var suffix1$22 = $m_sci_VectorStatics$().bJ(this.c, f);
  return new $c_sci_Vector3(prefix1$21, this.aG, prefix2$10, this.aK, data3$11, suffix2$10, suffix1$22, this.e);
});
$p.bL = (function(lo, hi) {
  var b = new $c_sci_VectorSliceBuilder(lo, hi);
  b.E(1, this.b);
  b.E(2, this.aQ);
  b.E(3, this.ar);
  b.E(2, this.as);
  b.E(1, this.c);
  return b.cc();
});
$p.bx = (function() {
  if ((this.aG > 1)) {
    var a = this.b;
    var prefix1$22 = $m_ju_Arrays$().t(a, 1, a.a.length);
    var len1$20 = ((this.aG - 1) | 0);
    var len12$11 = ((this.aK - 1) | 0);
    var length0$23 = ((this.e - 1) | 0);
    return new $c_sci_Vector3(prefix1$22, len1$20, this.aQ, len12$11, this.ar, this.as, this.c, length0$23);
  } else {
    return this.bL(1, this.e);
  }
});
$p.bY = (function() {
  return 5;
});
$p.bX = (function(idx) {
  switch (idx) {
    case 0: {
      return this.b;
      break;
    }
    case 1: {
      return this.aQ;
      break;
    }
    case 2: {
      return this.ar;
      break;
    }
    case 3: {
      return this.as;
      break;
    }
    case 4: {
      return this.c;
      break;
    }
    default: {
      throw new $c_s_MatchError(idx);
    }
  }
});
$p.f = (function(v1) {
  var index = (v1 | 0);
  if (((index >= 0) && (index < this.e))) {
    var io = ((index - this.aK) | 0);
    if ((io >= 0)) {
      var i3 = ((io >>> 10) | 0);
      var i2 = (31 & ((io >>> 5) | 0));
      var i1 = (31 & io);
      return ((i3 < this.ar.a.length) ? this.ar.a[i3].a[i2].a[i1] : ((i2 < this.as.a.length) ? this.as.a[i2].a[i1] : this.c.a[i1]));
    } else if ((index >= this.aG)) {
      var io$2 = ((index - this.aG) | 0);
      return this.aQ.a[((io$2 >>> 5) | 0)].a[(31 & io$2)];
    } else {
      return this.b.a[index];
    }
  } else {
    throw this.ax(index);
  }
});
$p.cb = (function(f) {
  return this.bU(f);
});
$p.F = (function() {
  return this.bx();
});
var $d_sci_Vector3 = new $TypeData().i($c_sci_Vector3, "scala.collection.immutable.Vector3", ({
  d0: 1,
  X: 1,
  Z: 1,
  Q: 1,
  I: 1,
  u: 1,
  h: 1,
  b: 1,
  c: 1,
  g: 1,
  f: 1,
  e: 1,
  i: 1,
  j: 1,
  k: 1,
  d: 1,
  p: 1,
  l: 1,
  D: 1,
  z: 1,
  s: 1,
  w: 1,
  P: 1,
  J: 1,
  o: 1,
  y: 1,
  K: 1,
  a: 1,
  A: 1
}));
/** @constructor */
function $c_sci_Vector4(_prefix1, len1, prefix2, len12, prefix3, len123, data4, suffix3, suffix2, _suffix1, _length0) {
  this.b = null;
  this.c = null;
  this.e = 0;
  this.ap = 0;
  this.aB = null;
  this.at = 0;
  this.aC = null;
  this.au = 0;
  this.ac = null;
  this.ae = null;
  this.ad = null;
  this.ap = len1;
  this.aB = prefix2;
  this.at = len12;
  this.aC = prefix3;
  this.au = len123;
  this.ac = data4;
  this.ae = suffix3;
  this.ad = suffix2;
  $ct_sci_BigVector__AO__AO__I__(this, _prefix1, _suffix1, _length0);
}
$p = $c_sci_Vector4.prototype = new $h_sci_BigVector();
$p.constructor = $c_sci_Vector4;
/** @constructor */
function $h_sci_Vector4() {
}
$h_sci_Vector4.prototype = $p;
$p.x = (function(index) {
  if (((index >= 0) && (index < this.e))) {
    var io = ((index - this.au) | 0);
    if ((io >= 0)) {
      var i4 = ((io >>> 15) | 0);
      var i3 = (31 & ((io >>> 10) | 0));
      var i2 = (31 & ((io >>> 5) | 0));
      var i1 = (31 & io);
      return ((i4 < this.ac.a.length) ? this.ac.a[i4].a[i3].a[i2].a[i1] : ((i3 < this.ae.a.length) ? this.ae.a[i3].a[i2].a[i1] : ((i2 < this.ad.a.length) ? this.ad.a[i2].a[i1] : this.c.a[i1])));
    } else if ((index >= this.at)) {
      var io$2 = ((index - this.at) | 0);
      return this.aC.a[((io$2 >>> 10) | 0)].a[(31 & ((io$2 >>> 5) | 0))].a[(31 & io$2)];
    } else if ((index >= this.ap)) {
      var io$3 = ((index - this.ap) | 0);
      return this.aB.a[((io$3 >>> 5) | 0)].a[(31 & io$3)];
    } else {
      return this.b.a[index];
    }
  } else {
    throw this.ax(index);
  }
});
$p.cO = (function(index, elem) {
  if (((index >= 0) && (index < this.e))) {
    if ((index >= this.au)) {
      var io = ((index - this.au) | 0);
      var i4 = ((io >>> 15) | 0);
      var i3 = (31 & ((io >>> 10) | 0));
      var i2 = (31 & ((io >>> 5) | 0));
      var i1 = (31 & io);
      if ((i4 < this.ac.a.length)) {
        var a4 = this.ac;
        var a4c = a4.d();
        var a3 = a4c.a[i4];
        var a3c = a3.d();
        var a2 = a3c.a[i3];
        var a2c = a2.d();
        var a1 = a2c.a[i2];
        var a1c = a1.d();
        a1c.a[i1] = elem;
        a2c.a[i2] = a1c;
        a3c.a[i3] = a2c;
        a4c.a[i4] = a3c;
        return new $c_sci_Vector4(this.b, this.ap, this.aB, this.at, this.aC, this.au, a4c, this.ae, this.ad, this.c, this.e);
      } else if ((i3 < this.ae.a.length)) {
        var a3$1 = this.ae;
        var a3c$1 = a3$1.d();
        var a2$1 = a3c$1.a[i3];
        var a2c$1 = a2$1.d();
        var a1$1 = a2c$1.a[i2];
        var a1c$1 = a1$1.d();
        a1c$1.a[i1] = elem;
        a2c$1.a[i2] = a1c$1;
        a3c$1.a[i3] = a2c$1;
        return new $c_sci_Vector4(this.b, this.ap, this.aB, this.at, this.aC, this.au, this.ac, a3c$1, this.ad, this.c, this.e);
      } else if ((i2 < this.ad.a.length)) {
        var a2$2 = this.ad;
        var a2c$2 = a2$2.d();
        var a1$2 = a2c$2.a[i2];
        var a1c$2 = a1$2.d();
        a1c$2.a[i1] = elem;
        a2c$2.a[i2] = a1c$2;
        return new $c_sci_Vector4(this.b, this.ap, this.aB, this.at, this.aC, this.au, this.ac, this.ae, a2c$2, this.c, this.e);
      } else {
        var a1$3 = this.c;
        var a1c$3 = a1$3.d();
        a1c$3.a[i1] = elem;
        return new $c_sci_Vector4(this.b, this.ap, this.aB, this.at, this.aC, this.au, this.ac, this.ae, this.ad, a1c$3, this.e);
      }
    } else if ((index >= this.at)) {
      var io$2 = ((index - this.at) | 0);
      var a3$2 = this.aC;
      var idx3 = ((io$2 >>> 10) | 0);
      var idx2 = (31 & ((io$2 >>> 5) | 0));
      var idx1 = (31 & io$2);
      var a3c$2 = a3$2.d();
      var a2$3 = a3c$2.a[idx3];
      var a2c$3 = a2$3.d();
      var a1$4 = a2c$3.a[idx2];
      var a1c$4 = a1$4.d();
      a1c$4.a[idx1] = elem;
      a2c$3.a[idx2] = a1c$4;
      a3c$2.a[idx3] = a2c$3;
      return new $c_sci_Vector4(this.b, this.ap, this.aB, this.at, a3c$2, this.au, this.ac, this.ae, this.ad, this.c, this.e);
    } else if ((index >= this.ap)) {
      var io$3 = ((index - this.ap) | 0);
      var a2$4 = this.aB;
      var idx2$1 = ((io$3 >>> 5) | 0);
      var idx1$1 = (31 & io$3);
      var a2c$4 = a2$4.d();
      var a1$5 = a2c$4.a[idx2$1];
      var a1c$5 = a1$5.d();
      a1c$5.a[idx1$1] = elem;
      a2c$4.a[idx2$1] = a1c$5;
      return new $c_sci_Vector4(this.b, this.ap, a2c$4, this.at, this.aC, this.au, this.ac, this.ae, this.ad, this.c, this.e);
    } else {
      var a1$6 = this.b;
      var a1c$6 = a1$6.d();
      a1c$6.a[index] = elem;
      return new $c_sci_Vector4(a1c$6, this.ap, this.aB, this.at, this.aC, this.au, this.ac, this.ae, this.ad, this.c, this.e);
    }
  } else {
    throw this.ax(index);
  }
});
$p.cI = (function(elem) {
  if ((this.c.a.length < 32)) {
    var suffix1$33 = $m_sci_VectorStatics$().dj(this.c, elem);
    var length0$33 = ((1 + this.e) | 0);
    return new $c_sci_Vector4(this.b, this.ap, this.aB, this.at, this.aC, this.au, this.ac, this.ae, this.ad, suffix1$33, length0$33);
  } else if ((this.ad.a.length < 31)) {
    var suffix2$22 = $m_sci_VectorStatics$().s(this.ad, this.c);
    var a = new $ac_O(1);
    a.a[0] = elem;
    var length0$34 = ((1 + this.e) | 0);
    return new $c_sci_Vector4(this.b, this.ap, this.aB, this.at, this.aC, this.au, this.ac, this.ae, suffix2$22, a, length0$34);
  } else if ((this.ae.a.length < 31)) {
    var suffix3$9 = $m_sci_VectorStatics$().s(this.ae, $m_sci_VectorStatics$().s(this.ad, this.c));
    var a$1 = new $ac_O(1);
    a$1.a[0] = elem;
    var length0$35 = ((1 + this.e) | 0);
    return new $c_sci_Vector4(this.b, this.ap, this.aB, this.at, this.aC, this.au, this.ac, suffix3$9, $m_sci_VectorStatics$().ai, a$1, length0$35);
  } else if ((this.ac.a.length < 30)) {
    var data4$10 = $m_sci_VectorStatics$().s(this.ac, $m_sci_VectorStatics$().s(this.ae, $m_sci_VectorStatics$().s(this.ad, this.c)));
    var a$2 = new $ac_O(1);
    a$2.a[0] = elem;
    var length0$36 = ((1 + this.e) | 0);
    return new $c_sci_Vector4(this.b, this.ap, this.aB, this.at, this.aC, this.au, data4$10, $m_sci_VectorStatics$().aR, $m_sci_VectorStatics$().ai, a$2, length0$36);
  } else {
    var $x_11 = this.b;
    var $x_10 = this.ap;
    var $x_9 = this.aB;
    var $x_8 = this.at;
    var $x_7 = this.aC;
    var $x_6 = this.au;
    var $x_5 = this.ac;
    var $x_4 = this.au;
    var $x_3 = $m_sci_VectorStatics$().dc;
    var x = $m_sci_VectorStatics$().s(this.ae, $m_sci_VectorStatics$().s(this.ad, this.c));
    var a$3 = new ($d_O.r().r().r().r().C)(1);
    a$3.a[0] = x;
    var $x_2 = $m_sci_VectorStatics$().aR;
    var $x_1 = $m_sci_VectorStatics$().ai;
    var a$4 = new $ac_O(1);
    a$4.a[0] = elem;
    return new $c_sci_Vector5($x_11, $x_10, $x_9, $x_8, $x_7, $x_6, $x_5, ((983040 + $x_4) | 0), $x_3, a$3, $x_2, $x_1, a$4, ((1 + this.e) | 0));
  }
});
$p.bU = (function(f) {
  var prefix1$39 = $m_sci_VectorStatics$().bJ(this.b, f);
  var prefix2$27 = $m_sci_VectorStatics$().Y(2, this.aB, f);
  var prefix3$14 = $m_sci_VectorStatics$().Y(3, this.aC, f);
  var data4$15 = $m_sci_VectorStatics$().Y(4, this.ac, f);
  var suffix3$14 = $m_sci_VectorStatics$().Y(3, this.ae, f);
  var suffix2$27 = $m_sci_VectorStatics$().Y(2, this.ad, f);
  var suffix1$41 = $m_sci_VectorStatics$().bJ(this.c, f);
  return new $c_sci_Vector4(prefix1$39, this.ap, prefix2$27, this.at, prefix3$14, this.au, data4$15, suffix3$14, suffix2$27, suffix1$41, this.e);
});
$p.bL = (function(lo, hi) {
  var b = new $c_sci_VectorSliceBuilder(lo, hi);
  b.E(1, this.b);
  b.E(2, this.aB);
  b.E(3, this.aC);
  b.E(4, this.ac);
  b.E(3, this.ae);
  b.E(2, this.ad);
  b.E(1, this.c);
  return b.cc();
});
$p.bx = (function() {
  if ((this.ap > 1)) {
    var a = this.b;
    var prefix1$40 = $m_ju_Arrays$().t(a, 1, a.a.length);
    var len1$36 = ((this.ap - 1) | 0);
    var len12$28 = ((this.at - 1) | 0);
    var len123$15 = ((this.au - 1) | 0);
    var length0$42 = ((this.e - 1) | 0);
    return new $c_sci_Vector4(prefix1$40, len1$36, this.aB, len12$28, this.aC, len123$15, this.ac, this.ae, this.ad, this.c, length0$42);
  } else {
    return this.bL(1, this.e);
  }
});
$p.bY = (function() {
  return 7;
});
$p.bX = (function(idx) {
  switch (idx) {
    case 0: {
      return this.b;
      break;
    }
    case 1: {
      return this.aB;
      break;
    }
    case 2: {
      return this.aC;
      break;
    }
    case 3: {
      return this.ac;
      break;
    }
    case 4: {
      return this.ae;
      break;
    }
    case 5: {
      return this.ad;
      break;
    }
    case 6: {
      return this.c;
      break;
    }
    default: {
      throw new $c_s_MatchError(idx);
    }
  }
});
$p.f = (function(v1) {
  var index = (v1 | 0);
  if (((index >= 0) && (index < this.e))) {
    var io = ((index - this.au) | 0);
    if ((io >= 0)) {
      var i4 = ((io >>> 15) | 0);
      var i3 = (31 & ((io >>> 10) | 0));
      var i2 = (31 & ((io >>> 5) | 0));
      var i1 = (31 & io);
      return ((i4 < this.ac.a.length) ? this.ac.a[i4].a[i3].a[i2].a[i1] : ((i3 < this.ae.a.length) ? this.ae.a[i3].a[i2].a[i1] : ((i2 < this.ad.a.length) ? this.ad.a[i2].a[i1] : this.c.a[i1])));
    } else if ((index >= this.at)) {
      var io$2 = ((index - this.at) | 0);
      return this.aC.a[((io$2 >>> 10) | 0)].a[(31 & ((io$2 >>> 5) | 0))].a[(31 & io$2)];
    } else if ((index >= this.ap)) {
      var io$3 = ((index - this.ap) | 0);
      return this.aB.a[((io$3 >>> 5) | 0)].a[(31 & io$3)];
    } else {
      return this.b.a[index];
    }
  } else {
    throw this.ax(index);
  }
});
$p.cb = (function(f) {
  return this.bU(f);
});
$p.F = (function() {
  return this.bx();
});
var $d_sci_Vector4 = new $TypeData().i($c_sci_Vector4, "scala.collection.immutable.Vector4", ({
  d1: 1,
  X: 1,
  Z: 1,
  Q: 1,
  I: 1,
  u: 1,
  h: 1,
  b: 1,
  c: 1,
  g: 1,
  f: 1,
  e: 1,
  i: 1,
  j: 1,
  k: 1,
  d: 1,
  p: 1,
  l: 1,
  D: 1,
  z: 1,
  s: 1,
  w: 1,
  P: 1,
  J: 1,
  o: 1,
  y: 1,
  K: 1,
  a: 1,
  A: 1
}));
/** @constructor */
function $c_sci_Vector5(_prefix1, len1, prefix2, len12, prefix3, len123, prefix4, len1234, data5, suffix4, suffix3, suffix2, _suffix1, _length0) {
  this.b = null;
  this.c = null;
  this.e = 0;
  this.a4 = 0;
  this.ak = null;
  this.af = 0;
  this.al = null;
  this.ag = 0;
  this.am = null;
  this.ah = 0;
  this.T = null;
  this.W = null;
  this.V = null;
  this.U = null;
  this.a4 = len1;
  this.ak = prefix2;
  this.af = len12;
  this.al = prefix3;
  this.ag = len123;
  this.am = prefix4;
  this.ah = len1234;
  this.T = data5;
  this.W = suffix4;
  this.V = suffix3;
  this.U = suffix2;
  $ct_sci_BigVector__AO__AO__I__(this, _prefix1, _suffix1, _length0);
}
$p = $c_sci_Vector5.prototype = new $h_sci_BigVector();
$p.constructor = $c_sci_Vector5;
/** @constructor */
function $h_sci_Vector5() {
}
$h_sci_Vector5.prototype = $p;
$p.x = (function(index) {
  if (((index >= 0) && (index < this.e))) {
    var io = ((index - this.ah) | 0);
    if ((io >= 0)) {
      var i5 = ((io >>> 20) | 0);
      var i4 = (31 & ((io >>> 15) | 0));
      var i3 = (31 & ((io >>> 10) | 0));
      var i2 = (31 & ((io >>> 5) | 0));
      var i1 = (31 & io);
      return ((i5 < this.T.a.length) ? this.T.a[i5].a[i4].a[i3].a[i2].a[i1] : ((i4 < this.W.a.length) ? this.W.a[i4].a[i3].a[i2].a[i1] : ((i3 < this.V.a.length) ? this.V.a[i3].a[i2].a[i1] : ((i2 < this.U.a.length) ? this.U.a[i2].a[i1] : this.c.a[i1]))));
    } else if ((index >= this.ag)) {
      var io$2 = ((index - this.ag) | 0);
      return this.am.a[((io$2 >>> 15) | 0)].a[(31 & ((io$2 >>> 10) | 0))].a[(31 & ((io$2 >>> 5) | 0))].a[(31 & io$2)];
    } else if ((index >= this.af)) {
      var io$3 = ((index - this.af) | 0);
      return this.al.a[((io$3 >>> 10) | 0)].a[(31 & ((io$3 >>> 5) | 0))].a[(31 & io$3)];
    } else if ((index >= this.a4)) {
      var io$4 = ((index - this.a4) | 0);
      return this.ak.a[((io$4 >>> 5) | 0)].a[(31 & io$4)];
    } else {
      return this.b.a[index];
    }
  } else {
    throw this.ax(index);
  }
});
$p.cO = (function(index, elem) {
  if (((index >= 0) && (index < this.e))) {
    if ((index >= this.ah)) {
      var io = ((index - this.ah) | 0);
      var i5 = ((io >>> 20) | 0);
      var i4 = (31 & ((io >>> 15) | 0));
      var i3 = (31 & ((io >>> 10) | 0));
      var i2 = (31 & ((io >>> 5) | 0));
      var i1 = (31 & io);
      if ((i5 < this.T.a.length)) {
        var a5 = this.T;
        var a5c = a5.d();
        var a4 = a5c.a[i5];
        var a4c = a4.d();
        var a3 = a4c.a[i4];
        var a3c = a3.d();
        var a2 = a3c.a[i3];
        var a2c = a2.d();
        var a1 = a2c.a[i2];
        var a1c = a1.d();
        a1c.a[i1] = elem;
        a2c.a[i2] = a1c;
        a3c.a[i3] = a2c;
        a4c.a[i4] = a3c;
        a5c.a[i5] = a4c;
        return new $c_sci_Vector5(this.b, this.a4, this.ak, this.af, this.al, this.ag, this.am, this.ah, a5c, this.W, this.V, this.U, this.c, this.e);
      } else if ((i4 < this.W.a.length)) {
        var a4$1 = this.W;
        var a4c$1 = a4$1.d();
        var a3$1 = a4c$1.a[i4];
        var a3c$1 = a3$1.d();
        var a2$1 = a3c$1.a[i3];
        var a2c$1 = a2$1.d();
        var a1$1 = a2c$1.a[i2];
        var a1c$1 = a1$1.d();
        a1c$1.a[i1] = elem;
        a2c$1.a[i2] = a1c$1;
        a3c$1.a[i3] = a2c$1;
        a4c$1.a[i4] = a3c$1;
        return new $c_sci_Vector5(this.b, this.a4, this.ak, this.af, this.al, this.ag, this.am, this.ah, this.T, a4c$1, this.V, this.U, this.c, this.e);
      } else if ((i3 < this.V.a.length)) {
        var a3$2 = this.V;
        var a3c$2 = a3$2.d();
        var a2$2 = a3c$2.a[i3];
        var a2c$2 = a2$2.d();
        var a1$2 = a2c$2.a[i2];
        var a1c$2 = a1$2.d();
        a1c$2.a[i1] = elem;
        a2c$2.a[i2] = a1c$2;
        a3c$2.a[i3] = a2c$2;
        return new $c_sci_Vector5(this.b, this.a4, this.ak, this.af, this.al, this.ag, this.am, this.ah, this.T, this.W, a3c$2, this.U, this.c, this.e);
      } else if ((i2 < this.U.a.length)) {
        var a2$3 = this.U;
        var a2c$3 = a2$3.d();
        var a1$3 = a2c$3.a[i2];
        var a1c$3 = a1$3.d();
        a1c$3.a[i1] = elem;
        a2c$3.a[i2] = a1c$3;
        return new $c_sci_Vector5(this.b, this.a4, this.ak, this.af, this.al, this.ag, this.am, this.ah, this.T, this.W, this.V, a2c$3, this.c, this.e);
      } else {
        var a1$4 = this.c;
        var a1c$4 = a1$4.d();
        a1c$4.a[i1] = elem;
        return new $c_sci_Vector5(this.b, this.a4, this.ak, this.af, this.al, this.ag, this.am, this.ah, this.T, this.W, this.V, this.U, a1c$4, this.e);
      }
    } else if ((index >= this.ag)) {
      var io$2 = ((index - this.ag) | 0);
      var a4$2 = this.am;
      var idx4 = ((io$2 >>> 15) | 0);
      var idx3 = (31 & ((io$2 >>> 10) | 0));
      var idx2 = (31 & ((io$2 >>> 5) | 0));
      var idx1 = (31 & io$2);
      var a4c$2 = a4$2.d();
      var a3$3 = a4c$2.a[idx4];
      var a3c$3 = a3$3.d();
      var a2$4 = a3c$3.a[idx3];
      var a2c$4 = a2$4.d();
      var a1$5 = a2c$4.a[idx2];
      var a1c$5 = a1$5.d();
      a1c$5.a[idx1] = elem;
      a2c$4.a[idx2] = a1c$5;
      a3c$3.a[idx3] = a2c$4;
      a4c$2.a[idx4] = a3c$3;
      return new $c_sci_Vector5(this.b, this.a4, this.ak, this.af, this.al, this.ag, a4c$2, this.ah, this.T, this.W, this.V, this.U, this.c, this.e);
    } else if ((index >= this.af)) {
      var io$3 = ((index - this.af) | 0);
      var a3$4 = this.al;
      var idx3$1 = ((io$3 >>> 10) | 0);
      var idx2$1 = (31 & ((io$3 >>> 5) | 0));
      var idx1$1 = (31 & io$3);
      var a3c$4 = a3$4.d();
      var a2$5 = a3c$4.a[idx3$1];
      var a2c$5 = a2$5.d();
      var a1$6 = a2c$5.a[idx2$1];
      var a1c$6 = a1$6.d();
      a1c$6.a[idx1$1] = elem;
      a2c$5.a[idx2$1] = a1c$6;
      a3c$4.a[idx3$1] = a2c$5;
      return new $c_sci_Vector5(this.b, this.a4, this.ak, this.af, a3c$4, this.ag, this.am, this.ah, this.T, this.W, this.V, this.U, this.c, this.e);
    } else if ((index >= this.a4)) {
      var io$4 = ((index - this.a4) | 0);
      var a2$6 = this.ak;
      var idx2$2 = ((io$4 >>> 5) | 0);
      var idx1$2 = (31 & io$4);
      var a2c$6 = a2$6.d();
      var a1$7 = a2c$6.a[idx2$2];
      var a1c$7 = a1$7.d();
      a1c$7.a[idx1$2] = elem;
      a2c$6.a[idx2$2] = a1c$7;
      return new $c_sci_Vector5(this.b, this.a4, a2c$6, this.af, this.al, this.ag, this.am, this.ah, this.T, this.W, this.V, this.U, this.c, this.e);
    } else {
      var a1$8 = this.b;
      var a1c$8 = a1$8.d();
      a1c$8.a[index] = elem;
      return new $c_sci_Vector5(a1c$8, this.a4, this.ak, this.af, this.al, this.ag, this.am, this.ah, this.T, this.W, this.V, this.U, this.c, this.e);
    }
  } else {
    throw this.ax(index);
  }
});
$p.cI = (function(elem) {
  if ((this.c.a.length < 32)) {
    var suffix1$54 = $m_sci_VectorStatics$().dj(this.c, elem);
    var length0$54 = ((1 + this.e) | 0);
    return new $c_sci_Vector5(this.b, this.a4, this.ak, this.af, this.al, this.ag, this.am, this.ah, this.T, this.W, this.V, this.U, suffix1$54, length0$54);
  } else if ((this.U.a.length < 31)) {
    var suffix2$41 = $m_sci_VectorStatics$().s(this.U, this.c);
    var a = new $ac_O(1);
    a.a[0] = elem;
    var length0$55 = ((1 + this.e) | 0);
    return new $c_sci_Vector5(this.b, this.a4, this.ak, this.af, this.al, this.ag, this.am, this.ah, this.T, this.W, this.V, suffix2$41, a, length0$55);
  } else if ((this.V.a.length < 31)) {
    var suffix3$29 = $m_sci_VectorStatics$().s(this.V, $m_sci_VectorStatics$().s(this.U, this.c));
    var a$1 = new $ac_O(1);
    a$1.a[0] = elem;
    var length0$56 = ((1 + this.e) | 0);
    return new $c_sci_Vector5(this.b, this.a4, this.ak, this.af, this.al, this.ag, this.am, this.ah, this.T, this.W, suffix3$29, $m_sci_VectorStatics$().ai, a$1, length0$56);
  } else if ((this.W.a.length < 31)) {
    var suffix4$12 = $m_sci_VectorStatics$().s(this.W, $m_sci_VectorStatics$().s(this.V, $m_sci_VectorStatics$().s(this.U, this.c)));
    var a$2 = new $ac_O(1);
    a$2.a[0] = elem;
    var length0$57 = ((1 + this.e) | 0);
    return new $c_sci_Vector5(this.b, this.a4, this.ak, this.af, this.al, this.ag, this.am, this.ah, this.T, suffix4$12, $m_sci_VectorStatics$().aR, $m_sci_VectorStatics$().ai, a$2, length0$57);
  } else if ((this.T.a.length < 30)) {
    var data5$13 = $m_sci_VectorStatics$().s(this.T, $m_sci_VectorStatics$().s(this.W, $m_sci_VectorStatics$().s(this.V, $m_sci_VectorStatics$().s(this.U, this.c))));
    var a$3 = new $ac_O(1);
    a$3.a[0] = elem;
    var length0$58 = ((1 + this.e) | 0);
    return new $c_sci_Vector5(this.b, this.a4, this.ak, this.af, this.al, this.ag, this.am, this.ah, data5$13, $m_sci_VectorStatics$().bP, $m_sci_VectorStatics$().aR, $m_sci_VectorStatics$().ai, a$3, length0$58);
  } else {
    var $x_14 = this.b;
    var $x_13 = this.a4;
    var $x_12 = this.ak;
    var $x_11 = this.af;
    var $x_10 = this.al;
    var $x_9 = this.ag;
    var $x_8 = this.am;
    var $x_7 = this.ah;
    var $x_6 = this.T;
    var $x_5 = this.ah;
    var $x_4 = $m_sci_VectorStatics$().eX;
    var x = $m_sci_VectorStatics$().s(this.W, $m_sci_VectorStatics$().s(this.V, $m_sci_VectorStatics$().s(this.U, this.c)));
    var a$4 = new ($d_O.r().r().r().r().r().C)(1);
    a$4.a[0] = x;
    var $x_3 = $m_sci_VectorStatics$().bP;
    var $x_2 = $m_sci_VectorStatics$().aR;
    var $x_1 = $m_sci_VectorStatics$().ai;
    var a$5 = new $ac_O(1);
    a$5.a[0] = elem;
    return new $c_sci_Vector6($x_14, $x_13, $x_12, $x_11, $x_10, $x_9, $x_8, $x_7, $x_6, ((31457280 + $x_5) | 0), $x_4, a$4, $x_3, $x_2, $x_1, a$5, ((1 + this.e) | 0));
  }
});
$p.bU = (function(f) {
  var prefix1$61 = $m_sci_VectorStatics$().bJ(this.b, f);
  var prefix2$47 = $m_sci_VectorStatics$().Y(2, this.ak, f);
  var prefix3$35 = $m_sci_VectorStatics$().Y(3, this.al, f);
  var prefix4$18 = $m_sci_VectorStatics$().Y(4, this.am, f);
  var data5$19 = $m_sci_VectorStatics$().Y(5, this.T, f);
  var suffix4$18 = $m_sci_VectorStatics$().Y(4, this.W, f);
  var suffix3$35 = $m_sci_VectorStatics$().Y(3, this.V, f);
  var suffix2$47 = $m_sci_VectorStatics$().Y(2, this.U, f);
  var suffix1$64 = $m_sci_VectorStatics$().bJ(this.c, f);
  return new $c_sci_Vector5(prefix1$61, this.a4, prefix2$47, this.af, prefix3$35, this.ag, prefix4$18, this.ah, data5$19, suffix4$18, suffix3$35, suffix2$47, suffix1$64, this.e);
});
$p.bL = (function(lo, hi) {
  var b = new $c_sci_VectorSliceBuilder(lo, hi);
  b.E(1, this.b);
  b.E(2, this.ak);
  b.E(3, this.al);
  b.E(4, this.am);
  b.E(5, this.T);
  b.E(4, this.W);
  b.E(3, this.V);
  b.E(2, this.U);
  b.E(1, this.c);
  return b.cc();
});
$p.bx = (function() {
  if ((this.a4 > 1)) {
    var a = this.b;
    var prefix1$62 = $m_ju_Arrays$().t(a, 1, a.a.length);
    var len1$55 = ((this.a4 - 1) | 0);
    var len12$48 = ((this.af - 1) | 0);
    var len123$36 = ((this.ag - 1) | 0);
    var len1234$19 = ((this.ah - 1) | 0);
    var length0$65 = ((this.e - 1) | 0);
    return new $c_sci_Vector5(prefix1$62, len1$55, this.ak, len12$48, this.al, len123$36, this.am, len1234$19, this.T, this.W, this.V, this.U, this.c, length0$65);
  } else {
    return this.bL(1, this.e);
  }
});
$p.bY = (function() {
  return 9;
});
$p.bX = (function(idx) {
  switch (idx) {
    case 0: {
      return this.b;
      break;
    }
    case 1: {
      return this.ak;
      break;
    }
    case 2: {
      return this.al;
      break;
    }
    case 3: {
      return this.am;
      break;
    }
    case 4: {
      return this.T;
      break;
    }
    case 5: {
      return this.W;
      break;
    }
    case 6: {
      return this.V;
      break;
    }
    case 7: {
      return this.U;
      break;
    }
    case 8: {
      return this.c;
      break;
    }
    default: {
      throw new $c_s_MatchError(idx);
    }
  }
});
$p.f = (function(v1) {
  var index = (v1 | 0);
  if (((index >= 0) && (index < this.e))) {
    var io = ((index - this.ah) | 0);
    if ((io >= 0)) {
      var i5 = ((io >>> 20) | 0);
      var i4 = (31 & ((io >>> 15) | 0));
      var i3 = (31 & ((io >>> 10) | 0));
      var i2 = (31 & ((io >>> 5) | 0));
      var i1 = (31 & io);
      return ((i5 < this.T.a.length) ? this.T.a[i5].a[i4].a[i3].a[i2].a[i1] : ((i4 < this.W.a.length) ? this.W.a[i4].a[i3].a[i2].a[i1] : ((i3 < this.V.a.length) ? this.V.a[i3].a[i2].a[i1] : ((i2 < this.U.a.length) ? this.U.a[i2].a[i1] : this.c.a[i1]))));
    } else if ((index >= this.ag)) {
      var io$2 = ((index - this.ag) | 0);
      return this.am.a[((io$2 >>> 15) | 0)].a[(31 & ((io$2 >>> 10) | 0))].a[(31 & ((io$2 >>> 5) | 0))].a[(31 & io$2)];
    } else if ((index >= this.af)) {
      var io$3 = ((index - this.af) | 0);
      return this.al.a[((io$3 >>> 10) | 0)].a[(31 & ((io$3 >>> 5) | 0))].a[(31 & io$3)];
    } else if ((index >= this.a4)) {
      var io$4 = ((index - this.a4) | 0);
      return this.ak.a[((io$4 >>> 5) | 0)].a[(31 & io$4)];
    } else {
      return this.b.a[index];
    }
  } else {
    throw this.ax(index);
  }
});
$p.cb = (function(f) {
  return this.bU(f);
});
$p.F = (function() {
  return this.bx();
});
var $d_sci_Vector5 = new $TypeData().i($c_sci_Vector5, "scala.collection.immutable.Vector5", ({
  d2: 1,
  X: 1,
  Z: 1,
  Q: 1,
  I: 1,
  u: 1,
  h: 1,
  b: 1,
  c: 1,
  g: 1,
  f: 1,
  e: 1,
  i: 1,
  j: 1,
  k: 1,
  d: 1,
  p: 1,
  l: 1,
  D: 1,
  z: 1,
  s: 1,
  w: 1,
  P: 1,
  J: 1,
  o: 1,
  y: 1,
  K: 1,
  a: 1,
  A: 1
}));
/** @constructor */
function $c_sci_Vector6(_prefix1, len1, prefix2, len12, prefix3, len123, prefix4, len1234, prefix5, len12345, data6, suffix5, suffix4, suffix3, suffix2, _suffix1, _length0) {
  this.b = null;
  this.c = null;
  this.e = 0;
  this.X = 0;
  this.a6 = null;
  this.a0 = 0;
  this.a7 = null;
  this.a1 = 0;
  this.a8 = null;
  this.a2 = 0;
  this.a9 = null;
  this.a5 = 0;
  this.J = null;
  this.N = null;
  this.M = null;
  this.L = null;
  this.K = null;
  this.X = len1;
  this.a6 = prefix2;
  this.a0 = len12;
  this.a7 = prefix3;
  this.a1 = len123;
  this.a8 = prefix4;
  this.a2 = len1234;
  this.a9 = prefix5;
  this.a5 = len12345;
  this.J = data6;
  this.N = suffix5;
  this.M = suffix4;
  this.L = suffix3;
  this.K = suffix2;
  $ct_sci_BigVector__AO__AO__I__(this, _prefix1, _suffix1, _length0);
}
$p = $c_sci_Vector6.prototype = new $h_sci_BigVector();
$p.constructor = $c_sci_Vector6;
/** @constructor */
function $h_sci_Vector6() {
}
$h_sci_Vector6.prototype = $p;
$p.x = (function(index) {
  if (((index >= 0) && (index < this.e))) {
    var io = ((index - this.a5) | 0);
    if ((io >= 0)) {
      var i6 = ((io >>> 25) | 0);
      var i5 = (31 & ((io >>> 20) | 0));
      var i4 = (31 & ((io >>> 15) | 0));
      var i3 = (31 & ((io >>> 10) | 0));
      var i2 = (31 & ((io >>> 5) | 0));
      var i1 = (31 & io);
      return ((i6 < this.J.a.length) ? this.J.a[i6].a[i5].a[i4].a[i3].a[i2].a[i1] : ((i5 < this.N.a.length) ? this.N.a[i5].a[i4].a[i3].a[i2].a[i1] : ((i4 < this.M.a.length) ? this.M.a[i4].a[i3].a[i2].a[i1] : ((i3 < this.L.a.length) ? this.L.a[i3].a[i2].a[i1] : ((i2 < this.K.a.length) ? this.K.a[i2].a[i1] : this.c.a[i1])))));
    } else if ((index >= this.a2)) {
      var io$2 = ((index - this.a2) | 0);
      return this.a9.a[((io$2 >>> 20) | 0)].a[(31 & ((io$2 >>> 15) | 0))].a[(31 & ((io$2 >>> 10) | 0))].a[(31 & ((io$2 >>> 5) | 0))].a[(31 & io$2)];
    } else if ((index >= this.a1)) {
      var io$3 = ((index - this.a1) | 0);
      return this.a8.a[((io$3 >>> 15) | 0)].a[(31 & ((io$3 >>> 10) | 0))].a[(31 & ((io$3 >>> 5) | 0))].a[(31 & io$3)];
    } else if ((index >= this.a0)) {
      var io$4 = ((index - this.a0) | 0);
      return this.a7.a[((io$4 >>> 10) | 0)].a[(31 & ((io$4 >>> 5) | 0))].a[(31 & io$4)];
    } else if ((index >= this.X)) {
      var io$5 = ((index - this.X) | 0);
      return this.a6.a[((io$5 >>> 5) | 0)].a[(31 & io$5)];
    } else {
      return this.b.a[index];
    }
  } else {
    throw this.ax(index);
  }
});
$p.cO = (function(index, elem) {
  if (((index >= 0) && (index < this.e))) {
    if ((index >= this.a5)) {
      var io = ((index - this.a5) | 0);
      var i6 = ((io >>> 25) | 0);
      var i5 = (31 & ((io >>> 20) | 0));
      var i4 = (31 & ((io >>> 15) | 0));
      var i3 = (31 & ((io >>> 10) | 0));
      var i2 = (31 & ((io >>> 5) | 0));
      var i1 = (31 & io);
      if ((i6 < this.J.a.length)) {
        var a6 = this.J;
        var a6c = a6.d();
        var a5 = a6c.a[i6];
        var a5c = a5.d();
        var a4 = a5c.a[i5];
        var a4c = a4.d();
        var a3 = a4c.a[i4];
        var a3c = a3.d();
        var a2 = a3c.a[i3];
        var a2c = a2.d();
        var a1 = a2c.a[i2];
        var a1c = a1.d();
        a1c.a[i1] = elem;
        a2c.a[i2] = a1c;
        a3c.a[i3] = a2c;
        a4c.a[i4] = a3c;
        a5c.a[i5] = a4c;
        a6c.a[i6] = a5c;
        return new $c_sci_Vector6(this.b, this.X, this.a6, this.a0, this.a7, this.a1, this.a8, this.a2, this.a9, this.a5, a6c, this.N, this.M, this.L, this.K, this.c, this.e);
      } else if ((i5 < this.N.a.length)) {
        var a5$1 = this.N;
        var a5c$1 = a5$1.d();
        var a4$1 = a5c$1.a[i5];
        var a4c$1 = a4$1.d();
        var a3$1 = a4c$1.a[i4];
        var a3c$1 = a3$1.d();
        var a2$1 = a3c$1.a[i3];
        var a2c$1 = a2$1.d();
        var a1$1 = a2c$1.a[i2];
        var a1c$1 = a1$1.d();
        a1c$1.a[i1] = elem;
        a2c$1.a[i2] = a1c$1;
        a3c$1.a[i3] = a2c$1;
        a4c$1.a[i4] = a3c$1;
        a5c$1.a[i5] = a4c$1;
        return new $c_sci_Vector6(this.b, this.X, this.a6, this.a0, this.a7, this.a1, this.a8, this.a2, this.a9, this.a5, this.J, a5c$1, this.M, this.L, this.K, this.c, this.e);
      } else if ((i4 < this.M.a.length)) {
        var a4$2 = this.M;
        var a4c$2 = a4$2.d();
        var a3$2 = a4c$2.a[i4];
        var a3c$2 = a3$2.d();
        var a2$2 = a3c$2.a[i3];
        var a2c$2 = a2$2.d();
        var a1$2 = a2c$2.a[i2];
        var a1c$2 = a1$2.d();
        a1c$2.a[i1] = elem;
        a2c$2.a[i2] = a1c$2;
        a3c$2.a[i3] = a2c$2;
        a4c$2.a[i4] = a3c$2;
        return new $c_sci_Vector6(this.b, this.X, this.a6, this.a0, this.a7, this.a1, this.a8, this.a2, this.a9, this.a5, this.J, this.N, a4c$2, this.L, this.K, this.c, this.e);
      } else if ((i3 < this.L.a.length)) {
        var a3$3 = this.L;
        var a3c$3 = a3$3.d();
        var a2$3 = a3c$3.a[i3];
        var a2c$3 = a2$3.d();
        var a1$3 = a2c$3.a[i2];
        var a1c$3 = a1$3.d();
        a1c$3.a[i1] = elem;
        a2c$3.a[i2] = a1c$3;
        a3c$3.a[i3] = a2c$3;
        return new $c_sci_Vector6(this.b, this.X, this.a6, this.a0, this.a7, this.a1, this.a8, this.a2, this.a9, this.a5, this.J, this.N, this.M, a3c$3, this.K, this.c, this.e);
      } else if ((i2 < this.K.a.length)) {
        var a2$4 = this.K;
        var a2c$4 = a2$4.d();
        var a1$4 = a2c$4.a[i2];
        var a1c$4 = a1$4.d();
        a1c$4.a[i1] = elem;
        a2c$4.a[i2] = a1c$4;
        return new $c_sci_Vector6(this.b, this.X, this.a6, this.a0, this.a7, this.a1, this.a8, this.a2, this.a9, this.a5, this.J, this.N, this.M, this.L, a2c$4, this.c, this.e);
      } else {
        var a1$5 = this.c;
        var a1c$5 = a1$5.d();
        a1c$5.a[i1] = elem;
        return new $c_sci_Vector6(this.b, this.X, this.a6, this.a0, this.a7, this.a1, this.a8, this.a2, this.a9, this.a5, this.J, this.N, this.M, this.L, this.K, a1c$5, this.e);
      }
    } else if ((index >= this.a2)) {
      var io$2 = ((index - this.a2) | 0);
      var a5$2 = this.a9;
      var idx5 = ((io$2 >>> 20) | 0);
      var idx4 = (31 & ((io$2 >>> 15) | 0));
      var idx3 = (31 & ((io$2 >>> 10) | 0));
      var idx2 = (31 & ((io$2 >>> 5) | 0));
      var idx1 = (31 & io$2);
      var a5c$2 = a5$2.d();
      var a4$3 = a5c$2.a[idx5];
      var a4c$3 = a4$3.d();
      var a3$4 = a4c$3.a[idx4];
      var a3c$4 = a3$4.d();
      var a2$5 = a3c$4.a[idx3];
      var a2c$5 = a2$5.d();
      var a1$6 = a2c$5.a[idx2];
      var a1c$6 = a1$6.d();
      a1c$6.a[idx1] = elem;
      a2c$5.a[idx2] = a1c$6;
      a3c$4.a[idx3] = a2c$5;
      a4c$3.a[idx4] = a3c$4;
      a5c$2.a[idx5] = a4c$3;
      return new $c_sci_Vector6(this.b, this.X, this.a6, this.a0, this.a7, this.a1, this.a8, this.a2, a5c$2, this.a5, this.J, this.N, this.M, this.L, this.K, this.c, this.e);
    } else if ((index >= this.a1)) {
      var io$3 = ((index - this.a1) | 0);
      var a4$4 = this.a8;
      var idx4$1 = ((io$3 >>> 15) | 0);
      var idx3$1 = (31 & ((io$3 >>> 10) | 0));
      var idx2$1 = (31 & ((io$3 >>> 5) | 0));
      var idx1$1 = (31 & io$3);
      var a4c$4 = a4$4.d();
      var a3$5 = a4c$4.a[idx4$1];
      var a3c$5 = a3$5.d();
      var a2$6 = a3c$5.a[idx3$1];
      var a2c$6 = a2$6.d();
      var a1$7 = a2c$6.a[idx2$1];
      var a1c$7 = a1$7.d();
      a1c$7.a[idx1$1] = elem;
      a2c$6.a[idx2$1] = a1c$7;
      a3c$5.a[idx3$1] = a2c$6;
      a4c$4.a[idx4$1] = a3c$5;
      return new $c_sci_Vector6(this.b, this.X, this.a6, this.a0, this.a7, this.a1, a4c$4, this.a2, this.a9, this.a5, this.J, this.N, this.M, this.L, this.K, this.c, this.e);
    } else if ((index >= this.a0)) {
      var io$4 = ((index - this.a0) | 0);
      var a3$6 = this.a7;
      var idx3$2 = ((io$4 >>> 10) | 0);
      var idx2$2 = (31 & ((io$4 >>> 5) | 0));
      var idx1$2 = (31 & io$4);
      var a3c$6 = a3$6.d();
      var a2$7 = a3c$6.a[idx3$2];
      var a2c$7 = a2$7.d();
      var a1$8 = a2c$7.a[idx2$2];
      var a1c$8 = a1$8.d();
      a1c$8.a[idx1$2] = elem;
      a2c$7.a[idx2$2] = a1c$8;
      a3c$6.a[idx3$2] = a2c$7;
      return new $c_sci_Vector6(this.b, this.X, this.a6, this.a0, a3c$6, this.a1, this.a8, this.a2, this.a9, this.a5, this.J, this.N, this.M, this.L, this.K, this.c, this.e);
    } else if ((index >= this.X)) {
      var io$5 = ((index - this.X) | 0);
      var a2$8 = this.a6;
      var idx2$3 = ((io$5 >>> 5) | 0);
      var idx1$3 = (31 & io$5);
      var a2c$8 = a2$8.d();
      var a1$9 = a2c$8.a[idx2$3];
      var a1c$9 = a1$9.d();
      a1c$9.a[idx1$3] = elem;
      a2c$8.a[idx2$3] = a1c$9;
      return new $c_sci_Vector6(this.b, this.X, a2c$8, this.a0, this.a7, this.a1, this.a8, this.a2, this.a9, this.a5, this.J, this.N, this.M, this.L, this.K, this.c, this.e);
    } else {
      var a1$10 = this.b;
      var a1c$10 = a1$10.d();
      a1c$10.a[index] = elem;
      return new $c_sci_Vector6(a1c$10, this.X, this.a6, this.a0, this.a7, this.a1, this.a8, this.a2, this.a9, this.a5, this.J, this.N, this.M, this.L, this.K, this.c, this.e);
    }
  } else {
    throw this.ax(index);
  }
});
$p.cI = (function(elem) {
  if ((this.c.a.length < 32)) {
    var suffix1$79 = $m_sci_VectorStatics$().dj(this.c, elem);
    var length0$79 = ((1 + this.e) | 0);
    return new $c_sci_Vector6(this.b, this.X, this.a6, this.a0, this.a7, this.a1, this.a8, this.a2, this.a9, this.a5, this.J, this.N, this.M, this.L, this.K, suffix1$79, length0$79);
  } else if ((this.K.a.length < 31)) {
    var suffix2$63 = $m_sci_VectorStatics$().s(this.K, this.c);
    var a = new $ac_O(1);
    a.a[0] = elem;
    var length0$80 = ((1 + this.e) | 0);
    return new $c_sci_Vector6(this.b, this.X, this.a6, this.a0, this.a7, this.a1, this.a8, this.a2, this.a9, this.a5, this.J, this.N, this.M, this.L, suffix2$63, a, length0$80);
  } else if ((this.L.a.length < 31)) {
    var suffix3$52 = $m_sci_VectorStatics$().s(this.L, $m_sci_VectorStatics$().s(this.K, this.c));
    var a$1 = new $ac_O(1);
    a$1.a[0] = elem;
    var length0$81 = ((1 + this.e) | 0);
    return new $c_sci_Vector6(this.b, this.X, this.a6, this.a0, this.a7, this.a1, this.a8, this.a2, this.a9, this.a5, this.J, this.N, this.M, suffix3$52, $m_sci_VectorStatics$().ai, a$1, length0$81);
  } else if ((this.M.a.length < 31)) {
    var suffix4$36 = $m_sci_VectorStatics$().s(this.M, $m_sci_VectorStatics$().s(this.L, $m_sci_VectorStatics$().s(this.K, this.c)));
    var a$2 = new $ac_O(1);
    a$2.a[0] = elem;
    var length0$82 = ((1 + this.e) | 0);
    return new $c_sci_Vector6(this.b, this.X, this.a6, this.a0, this.a7, this.a1, this.a8, this.a2, this.a9, this.a5, this.J, this.N, suffix4$36, $m_sci_VectorStatics$().aR, $m_sci_VectorStatics$().ai, a$2, length0$82);
  } else if ((this.N.a.length < 31)) {
    var suffix5$15 = $m_sci_VectorStatics$().s(this.N, $m_sci_VectorStatics$().s(this.M, $m_sci_VectorStatics$().s(this.L, $m_sci_VectorStatics$().s(this.K, this.c))));
    var a$3 = new $ac_O(1);
    a$3.a[0] = elem;
    var length0$83 = ((1 + this.e) | 0);
    return new $c_sci_Vector6(this.b, this.X, this.a6, this.a0, this.a7, this.a1, this.a8, this.a2, this.a9, this.a5, this.J, suffix5$15, $m_sci_VectorStatics$().bP, $m_sci_VectorStatics$().aR, $m_sci_VectorStatics$().ai, a$3, length0$83);
  } else if ((this.J.a.length < 62)) {
    var data6$16 = $m_sci_VectorStatics$().s(this.J, $m_sci_VectorStatics$().s(this.N, $m_sci_VectorStatics$().s(this.M, $m_sci_VectorStatics$().s(this.L, $m_sci_VectorStatics$().s(this.K, this.c)))));
    var a$4 = new $ac_O(1);
    a$4.a[0] = elem;
    var length0$84 = ((1 + this.e) | 0);
    return new $c_sci_Vector6(this.b, this.X, this.a6, this.a0, this.a7, this.a1, this.a8, this.a2, this.a9, this.a5, data6$16, $m_sci_VectorStatics$().dc, $m_sci_VectorStatics$().bP, $m_sci_VectorStatics$().aR, $m_sci_VectorStatics$().ai, a$4, length0$84);
  } else {
    throw $ct_jl_IllegalArgumentException__(new $c_jl_IllegalArgumentException());
  }
});
$p.bU = (function(f) {
  var prefix1$87 = $m_sci_VectorStatics$().bJ(this.b, f);
  var prefix2$70 = $m_sci_VectorStatics$().Y(2, this.a6, f);
  var prefix3$59 = $m_sci_VectorStatics$().Y(3, this.a7, f);
  var prefix4$43 = $m_sci_VectorStatics$().Y(4, this.a8, f);
  var prefix5$22 = $m_sci_VectorStatics$().Y(5, this.a9, f);
  var data6$23 = $m_sci_VectorStatics$().Y(6, this.J, f);
  var suffix5$22 = $m_sci_VectorStatics$().Y(5, this.N, f);
  var suffix4$43 = $m_sci_VectorStatics$().Y(4, this.M, f);
  var suffix3$59 = $m_sci_VectorStatics$().Y(3, this.L, f);
  var suffix2$70 = $m_sci_VectorStatics$().Y(2, this.K, f);
  var suffix1$91 = $m_sci_VectorStatics$().bJ(this.c, f);
  return new $c_sci_Vector6(prefix1$87, this.X, prefix2$70, this.a0, prefix3$59, this.a1, prefix4$43, this.a2, prefix5$22, this.a5, data6$23, suffix5$22, suffix4$43, suffix3$59, suffix2$70, suffix1$91, this.e);
});
$p.bL = (function(lo, hi) {
  var b = new $c_sci_VectorSliceBuilder(lo, hi);
  b.E(1, this.b);
  b.E(2, this.a6);
  b.E(3, this.a7);
  b.E(4, this.a8);
  b.E(5, this.a9);
  b.E(6, this.J);
  b.E(5, this.N);
  b.E(4, this.M);
  b.E(3, this.L);
  b.E(2, this.K);
  b.E(1, this.c);
  return b.cc();
});
$p.bx = (function() {
  if ((this.X > 1)) {
    var a = this.b;
    var prefix1$88 = $m_ju_Arrays$().t(a, 1, a.a.length);
    var len1$77 = ((this.X - 1) | 0);
    var len12$71 = ((this.a0 - 1) | 0);
    var len123$60 = ((this.a1 - 1) | 0);
    var len1234$44 = ((this.a2 - 1) | 0);
    var len12345$23 = ((this.a5 - 1) | 0);
    var length0$92 = ((this.e - 1) | 0);
    return new $c_sci_Vector6(prefix1$88, len1$77, this.a6, len12$71, this.a7, len123$60, this.a8, len1234$44, this.a9, len12345$23, this.J, this.N, this.M, this.L, this.K, this.c, length0$92);
  } else {
    return this.bL(1, this.e);
  }
});
$p.bY = (function() {
  return 11;
});
$p.bX = (function(idx) {
  switch (idx) {
    case 0: {
      return this.b;
      break;
    }
    case 1: {
      return this.a6;
      break;
    }
    case 2: {
      return this.a7;
      break;
    }
    case 3: {
      return this.a8;
      break;
    }
    case 4: {
      return this.a9;
      break;
    }
    case 5: {
      return this.J;
      break;
    }
    case 6: {
      return this.N;
      break;
    }
    case 7: {
      return this.M;
      break;
    }
    case 8: {
      return this.L;
      break;
    }
    case 9: {
      return this.K;
      break;
    }
    case 10: {
      return this.c;
      break;
    }
    default: {
      throw new $c_s_MatchError(idx);
    }
  }
});
$p.f = (function(v1) {
  var index = (v1 | 0);
  if (((index >= 0) && (index < this.e))) {
    var io = ((index - this.a5) | 0);
    if ((io >= 0)) {
      var i6 = ((io >>> 25) | 0);
      var i5 = (31 & ((io >>> 20) | 0));
      var i4 = (31 & ((io >>> 15) | 0));
      var i3 = (31 & ((io >>> 10) | 0));
      var i2 = (31 & ((io >>> 5) | 0));
      var i1 = (31 & io);
      return ((i6 < this.J.a.length) ? this.J.a[i6].a[i5].a[i4].a[i3].a[i2].a[i1] : ((i5 < this.N.a.length) ? this.N.a[i5].a[i4].a[i3].a[i2].a[i1] : ((i4 < this.M.a.length) ? this.M.a[i4].a[i3].a[i2].a[i1] : ((i3 < this.L.a.length) ? this.L.a[i3].a[i2].a[i1] : ((i2 < this.K.a.length) ? this.K.a[i2].a[i1] : this.c.a[i1])))));
    } else if ((index >= this.a2)) {
      var io$2 = ((index - this.a2) | 0);
      return this.a9.a[((io$2 >>> 20) | 0)].a[(31 & ((io$2 >>> 15) | 0))].a[(31 & ((io$2 >>> 10) | 0))].a[(31 & ((io$2 >>> 5) | 0))].a[(31 & io$2)];
    } else if ((index >= this.a1)) {
      var io$3 = ((index - this.a1) | 0);
      return this.a8.a[((io$3 >>> 15) | 0)].a[(31 & ((io$3 >>> 10) | 0))].a[(31 & ((io$3 >>> 5) | 0))].a[(31 & io$3)];
    } else if ((index >= this.a0)) {
      var io$4 = ((index - this.a0) | 0);
      return this.a7.a[((io$4 >>> 10) | 0)].a[(31 & ((io$4 >>> 5) | 0))].a[(31 & io$4)];
    } else if ((index >= this.X)) {
      var io$5 = ((index - this.X) | 0);
      return this.a6.a[((io$5 >>> 5) | 0)].a[(31 & io$5)];
    } else {
      return this.b.a[index];
    }
  } else {
    throw this.ax(index);
  }
});
$p.cb = (function(f) {
  return this.bU(f);
});
$p.F = (function() {
  return this.bx();
});
var $d_sci_Vector6 = new $TypeData().i($c_sci_Vector6, "scala.collection.immutable.Vector6", ({
  d3: 1,
  X: 1,
  Z: 1,
  Q: 1,
  I: 1,
  u: 1,
  h: 1,
  b: 1,
  c: 1,
  g: 1,
  f: 1,
  e: 1,
  i: 1,
  j: 1,
  k: 1,
  d: 1,
  p: 1,
  l: 1,
  D: 1,
  z: 1,
  s: 1,
  w: 1,
  P: 1,
  J: 1,
  o: 1,
  y: 1,
  K: 1,
  a: 1,
  A: 1
}));
function $ct_scm_StringBuilder__jl_StringBuilder__($thiz, underlying) {
  $thiz.aM = underlying;
  return $thiz;
}
function $ct_scm_StringBuilder__($thiz) {
  $ct_scm_StringBuilder__jl_StringBuilder__($thiz, $ct_jl_StringBuilder__(new $c_jl_StringBuilder()));
  return $thiz;
}
/** @constructor */
function $c_scm_StringBuilder() {
  this.aM = null;
}
$p = $c_scm_StringBuilder.prototype = new $h_scm_AbstractSeq();
$p.constructor = $c_scm_StringBuilder;
/** @constructor */
function $h_scm_StringBuilder() {
}
$h_scm_StringBuilder.prototype = $p;
$p.b7 = (function(elems) {
  return $f_scm_Growable__addAll__sc_IterableOnce__scm_Growable(this, elems);
});
$p.bk = (function(size) {
});
$p.k = (function() {
  return $ct_sc_IndexedSeqView$IndexedSeqViewIterator__sc_IndexedSeqView__(new $c_sc_IndexedSeqView$IndexedSeqViewIterator(), new $c_sc_IndexedSeqView$Id(this));
});
$p.aZ = (function(n) {
  return $f_sc_IndexedSeqOps__drop__I__O(this, n);
});
$p.w = (function() {
  return $f_sc_IndexedSeqOps__head__O(this);
});
$p.bw = (function(len) {
  var x = this.aM.p();
  return ((x === len) ? 0 : ((x < len) ? (-1) : 1));
});
$p.bl = (function() {
  return "IndexedSeq";
});
$p.p = (function() {
  return this.aM.p();
});
$p.r = (function() {
  return this.aM.p();
});
$p.gM = (function(x) {
  var this$1 = this.aM;
  var str = ("" + $cToS(x));
  this$1.o = (this$1.o + str);
  return this;
});
$p.A = (function() {
  return this.aM.o;
});
$p.g3 = (function(xs) {
  if (false) {
    var this$3 = this.aM;
    var str = xs.it;
    this$3.o = (("" + this$3.o) + str);
  } else if (false) {
    this.aM.gU(xs.iu);
  } else if ((xs instanceof $c_scm_StringBuilder)) {
    var this$4 = this.aM;
    var s = xs.aM;
    this$4.o = (("" + this$4.o) + s);
  } else {
    var ks = xs.r();
    if ((ks !== 0)) {
      var b = this.aM;
      if ((ks > 0)) {
        b.p();
      }
      var it = xs.k();
      while (it.m()) {
        var c = $uC(it.g());
        var str$1 = ("" + $cToS(c));
        b.o = (b.o + str$1);
      }
    }
  }
  return this;
});
$p.l = (function() {
  return (this.aM.p() === 0);
});
$p.x = (function(i) {
  return $bC(this.aM.g6(i));
});
$p.f = (function(v1) {
  var i = (v1 | 0);
  return $bC(this.aM.g6(i));
});
$p.dZ = (function(coll) {
  return $ct_scm_StringBuilder__(new $c_scm_StringBuilder()).g3(coll);
});
$p.dm = (function(coll) {
  return $ct_scm_StringBuilder__(new $c_scm_StringBuilder()).g3(coll);
});
$p.b8 = (function(elem) {
  return this.gM($uC(elem));
});
$p.bj = (function() {
  return this.aM.o;
});
$p.bv = (function() {
  return $m_scm_IndexedSeq$();
});
function $isArrayOf_scm_StringBuilder(obj, depth) {
  return (!(!(((obj && obj.$classData) && (obj.$classData.D === depth)) && obj.$classData.B.n.b0)));
}
var $d_scm_StringBuilder = new $TypeData().i($c_scm_StringBuilder, "scala.collection.mutable.StringBuilder", ({
  b0: 1,
  a8: 1,
  u: 1,
  h: 1,
  b: 1,
  c: 1,
  g: 1,
  f: 1,
  e: 1,
  i: 1,
  j: 1,
  k: 1,
  d: 1,
  p: 1,
  aa: 1,
  R: 1,
  a9: 1,
  ac: 1,
  ab: 1,
  B: 1,
  C: 1,
  E: 1,
  a0: 1,
  s: 1,
  w: 1,
  aq: 1,
  ap: 1,
  ad: 1,
  a: 1
}));
function $isArrayOf_scm_LinkedHashMap(obj, depth) {
  return (!(!(((obj && obj.$classData) && (obj.$classData.D === depth)) && obj.$classData.B.n.dl)));
}
function $p_scm_ListBuffer__copyElems__V($thiz) {
  var buf = new $c_scm_ListBuffer().fn($thiz);
  $thiz.bG = buf.bG;
  $thiz.cm = buf.cm;
  $thiz.eh = false;
}
function $p_scm_ListBuffer__ensureUnaliased__V($thiz) {
  $thiz.ei = ((1 + $thiz.ei) | 0);
  if ($thiz.eh) {
    $p_scm_ListBuffer__copyElems__V($thiz);
  }
}
/** @constructor */
function $c_scm_ListBuffer() {
  this.ei = 0;
  this.bG = null;
  this.cm = null;
  this.eh = false;
  this.bH = 0;
  this.ei = 0;
  this.bG = $m_sci_Nil$();
  this.cm = null;
  this.eh = false;
  this.bH = 0;
}
$p = $c_scm_ListBuffer.prototype = new $h_scm_AbstractBuffer();
$p.constructor = $c_scm_ListBuffer;
/** @constructor */
function $h_scm_ListBuffer() {
}
$h_scm_ListBuffer.prototype = $p;
$p.bk = (function(size) {
});
$p.k = (function() {
  return new $c_scm_MutationTracker$CheckedIterator(this.bG.k(), new $c_sr_AbstractFunction0_$$Lambda$07eded5776954a9c145e92c329afd52873ad179c((() => this.ei)));
});
$p.dq = (function() {
  return $m_scm_ListBuffer$();
});
$p.x = (function(i) {
  return $f_sc_LinearSeqOps__apply__I__O(this.bG, i);
});
$p.p = (function() {
  return this.bH;
});
$p.r = (function() {
  return this.bH;
});
$p.l = (function() {
  return (this.bH === 0);
});
$p.gy = (function() {
  this.eh = (!this.l());
  return this.bG;
});
$p.gT = (function(elem) {
  $p_scm_ListBuffer__ensureUnaliased__V(this);
  var last1 = new $c_sci_$colon$colon(elem, $m_sci_Nil$());
  if ((this.bH === 0)) {
    this.bG = last1;
  } else {
    var x$proxy2 = this.cm;
    if ((x$proxy2 === null)) {
      $m_sr_Scala3RunTime$().cr();
    }
    x$proxy2.bZ = last1;
  }
  this.cm = last1;
  this.bH = ((1 + this.bH) | 0);
  return this;
});
$p.fn = (function(xs) {
  var it = xs.k();
  if (it.m()) {
    var len = 1;
    var last0 = new $c_sci_$colon$colon(it.g(), $m_sci_Nil$());
    this.bG = last0;
    while (it.m()) {
      var last1 = new $c_sci_$colon$colon(it.g(), $m_sci_Nil$());
      last0.bZ = last1;
      last0 = last1;
      len = ((1 + len) | 0);
    }
    this.bH = len;
    this.cm = last0;
  }
  return this;
});
$p.gL = (function(xs) {
  var it = xs.k();
  if (it.m()) {
    var fresh = new $c_scm_ListBuffer().fn(it);
    $p_scm_ListBuffer__ensureUnaliased__V(this);
    if ((this.bH === 0)) {
      this.bG = fresh.bG;
    } else {
      var x$proxy3 = this.cm;
      if ((x$proxy3 === null)) {
        $m_sr_Scala3RunTime$().cr();
      }
      x$proxy3.bZ = fresh.bG;
    }
    this.cm = fresh.cm;
    this.bH = ((this.bH + fresh.bH) | 0);
  }
  return this;
});
$p.bl = (function() {
  return "ListBuffer";
});
$p.bv = (function() {
  return $m_scm_ListBuffer$();
});
$p.f = (function(v1) {
  var i = (v1 | 0);
  return $f_sc_LinearSeqOps__apply__I__O(this.bG, i);
});
$p.bj = (function() {
  return this.gy();
});
$p.b8 = (function(elem) {
  return this.gT(elem);
});
$p.b7 = (function(elems) {
  return this.gL(elems);
});
function $isArrayOf_scm_ListBuffer(obj, depth) {
  return (!(!(((obj && obj.$classData) && (obj.$classData.D === depth)) && obj.$classData.B.n.aZ)));
}
var $d_scm_ListBuffer = new $TypeData().i($c_scm_ListBuffer, "scala.collection.mutable.ListBuffer", ({
  aZ: 1,
  an: 1,
  a8: 1,
  u: 1,
  h: 1,
  b: 1,
  c: 1,
  g: 1,
  f: 1,
  e: 1,
  i: 1,
  j: 1,
  k: 1,
  d: 1,
  p: 1,
  aa: 1,
  R: 1,
  a9: 1,
  ac: 1,
  ab: 1,
  B: 1,
  C: 1,
  ar: 1,
  ao: 1,
  o: 1,
  y: 1,
  E: 1,
  a0: 1,
  a: 1,
  A: 1
}));
function $ct_scm_ArrayBuffer__AO__I__($thiz, initialElements, initialSize) {
  $thiz.dd = 0;
  $thiz.cl = initialElements;
  $thiz.aL = initialSize;
  return $thiz;
}
function $ct_scm_ArrayBuffer__($thiz) {
  $ct_scm_ArrayBuffer__AO__I__($thiz, new $ac_O(16), 0);
  return $thiz;
}
/** @constructor */
function $c_scm_ArrayBuffer() {
  this.dd = 0;
  this.cl = null;
  this.aL = 0;
}
$p = $c_scm_ArrayBuffer.prototype = new $h_scm_AbstractBuffer();
$p.constructor = $c_scm_ArrayBuffer;
/** @constructor */
function $h_scm_ArrayBuffer() {
}
$h_scm_ArrayBuffer.prototype = $p;
$p.k = (function() {
  return this.ir().k();
});
$p.aZ = (function(n) {
  return $f_sc_IndexedSeqOps__drop__I__O(this, n);
});
$p.w = (function() {
  return $f_sc_IndexedSeqOps__head__O(this);
});
$p.bw = (function(len) {
  var x = this.aL;
  return ((x === len) ? 0 : ((x < len) ? (-1) : 1));
});
$p.r = (function() {
  return this.aL;
});
$p.f9 = (function(n) {
  this.cl = $m_scm_ArrayBuffer$().gw(this.cl, this.aL, n);
});
$p.bk = (function(size) {
  if (((size > this.aL) && (size >= 1))) {
    this.f9(size);
  }
});
$p.x = (function(n) {
  var hi = ((1 + n) | 0);
  if ((n < 0)) {
    throw $m_scg_CommonErrors$().fg(n, ((this.aL - 1) | 0));
  }
  if ((hi > this.aL)) {
    throw $m_scg_CommonErrors$().fg(((hi - 1) | 0), ((this.aL - 1) | 0));
  }
  return this.cl.a[n];
});
$p.p = (function() {
  return this.aL;
});
$p.ir = (function() {
  return new $c_scm_ArrayBufferView(this, new $c_sr_AbstractFunction0_$$Lambda$07eded5776954a9c145e92c329afd52873ad179c((() => this.dd)));
});
$p.dq = (function() {
  return $m_scm_ArrayBuffer$();
});
$p.gQ = (function(elem) {
  this.dd = ((1 + this.dd) | 0);
  var newSize = ((1 + this.aL) | 0);
  if ((this.cl.a.length <= ((newSize - 1) | 0))) {
    this.f9(newSize);
  }
  this.aL = newSize;
  this.cl.a[((newSize - 1) | 0)] = elem;
  return this;
});
$p.g1 = (function(elems) {
  if ((elems instanceof $c_scm_ArrayBuffer)) {
    var elemsLength = elems.aL;
    if ((elemsLength > 0)) {
      this.dd = ((1 + this.dd) | 0);
      this.f9(((this.aL + elemsLength) | 0));
      $m_s_Array$().f8(elems.cl, 0, this.cl, this.aL, elemsLength);
      this.aL = ((this.aL + elemsLength) | 0);
    }
  } else {
    $f_scm_Growable__addAll__sc_IterableOnce__scm_Growable(this, elems);
  }
  return this;
});
$p.bl = (function() {
  return "ArrayBuffer";
});
$p.c9 = (function(xs, start, len) {
  var srcLen = this.aL;
  var destLen = $m_jl_reflect_Array$().e1(xs);
  var limit = ((len < srcLen) ? len : srcLen);
  var capacity = ((start < 0) ? destLen : ((destLen - start) | 0));
  var total = ((capacity < limit) ? capacity : limit);
  var copied = ((total < 0) ? 0 : total);
  if ((copied > 0)) {
    $m_s_Array$().f8(this.cl, 0, xs, start, copied);
  }
  return copied;
});
$p.f = (function(v1) {
  return this.x((v1 | 0));
});
$p.bv = (function() {
  return $m_scm_ArrayBuffer$();
});
$p.b8 = (function(elem) {
  return this.gQ(elem);
});
$p.b7 = (function(elems) {
  return this.g1(elems);
});
function $isArrayOf_scm_ArrayBuffer(obj, depth) {
  return (!(!(((obj && obj.$classData) && (obj.$classData.D === depth)) && obj.$classData.B.n.aW)));
}
var $d_scm_ArrayBuffer = new $TypeData().i($c_scm_ArrayBuffer, "scala.collection.mutable.ArrayBuffer", ({
  aW: 1,
  an: 1,
  a8: 1,
  u: 1,
  h: 1,
  b: 1,
  c: 1,
  g: 1,
  f: 1,
  e: 1,
  i: 1,
  j: 1,
  k: 1,
  d: 1,
  p: 1,
  aa: 1,
  R: 1,
  a9: 1,
  ac: 1,
  ab: 1,
  B: 1,
  C: 1,
  ar: 1,
  ao: 1,
  s: 1,
  w: 1,
  aq: 1,
  ap: 1,
  aY: 1,
  o: 1,
  y: 1,
  a: 1,
  A: 1
}));
function $ct_sjs_js_WrappedArray__sjs_js_Array__($thiz, array) {
  $thiz.cF = array;
  return $thiz;
}
function $ct_sjs_js_WrappedArray__($thiz) {
  $ct_sjs_js_WrappedArray__sjs_js_Array__($thiz, []);
  return $thiz;
}
/** @constructor */
function $c_sjs_js_WrappedArray() {
  this.cF = null;
}
$p = $c_sjs_js_WrappedArray.prototype = new $h_scm_AbstractBuffer();
$p.constructor = $c_sjs_js_WrappedArray;
/** @constructor */
function $h_sjs_js_WrappedArray() {
}
$h_sjs_js_WrappedArray.prototype = $p;
$p.bk = (function(size) {
});
$p.bl = (function() {
  return "IndexedSeq";
});
$p.k = (function() {
  return $ct_sc_IndexedSeqView$IndexedSeqViewIterator__sc_IndexedSeqView__(new $c_sc_IndexedSeqView$IndexedSeqViewIterator(), new $c_sc_IndexedSeqView$Id(this));
});
$p.aZ = (function(n) {
  return $f_sc_IndexedSeqOps__drop__I__O(this, n);
});
$p.w = (function() {
  return $f_sc_IndexedSeqOps__head__O(this);
});
$p.bw = (function(len) {
  var x = (this.cF.length | 0);
  return ((x === len) ? 0 : ((x < len) ? (-1) : 1));
});
$p.dq = (function() {
  return $m_sjs_js_WrappedArray$();
});
$p.x = (function(index) {
  return this.cF[index];
});
$p.p = (function() {
  return (this.cF.length | 0);
});
$p.r = (function() {
  return (this.cF.length | 0);
});
$p.c7 = (function() {
  return "WrappedArray";
});
$p.bj = (function() {
  return this;
});
$p.b8 = (function(elem) {
  this.cF.push(elem);
  return this;
});
$p.f = (function(v1) {
  var index = (v1 | 0);
  return this.cF[index];
});
$p.bv = (function() {
  return $m_sjs_js_WrappedArray$();
});
var $d_sjs_js_WrappedArray = new $TypeData().i($c_sjs_js_WrappedArray, "scala.scalajs.js.WrappedArray", ({
  dR: 1,
  an: 1,
  a8: 1,
  u: 1,
  h: 1,
  b: 1,
  c: 1,
  g: 1,
  f: 1,
  e: 1,
  i: 1,
  j: 1,
  k: 1,
  d: 1,
  p: 1,
  aa: 1,
  R: 1,
  a9: 1,
  ac: 1,
  ab: 1,
  B: 1,
  C: 1,
  ar: 1,
  ao: 1,
  y: 1,
  o: 1,
  ap: 1,
  s: 1,
  w: 1,
  aq: 1,
  aY: 1,
  E: 1,
  a: 1
}));
var $t_Lsculpter_TokenType$__NUM_NEG = null;
var $t_Lsculpter_TokenType$__ENTER = null;
var $t_Lsculpter_TokenType$__QUESTION = null;
var $t_Lsculpter_TokenType$__JMP = null;
var $t_Lsculpter_TokenType$__CMP = null;
var $t_Lsculpter_TokenType$__PUSH = null;
var $t_Lsculpter_TokenType$__POP = null;
var $t_Lsculpter_TokenType$__DUP = null;
var $t_Lsculpter_TokenType$__MOV = null;
var $t_Lsculpter_TokenType$__ADD = null;
var $t_Lsculpter_TokenType$__SUB = null;
var $t_Lsculpter_TokenType$__MUL = null;
var $t_Lsculpter_TokenType$__DIV = null;
var $t_Lsculpter_TokenType$__MOD = null;
var $t_Lsculpter_TokenType$__NEG = null;
var $t_Lsculpter_TokenType$__NUMBER = null;
var $t_Lsculpter_TokenType$__STACK = null;
var $t_Lsculpter_TokenType$__NIL = null;
var $t_Lsculpter_TokenType$__EOF = null;
let $e_sculptEjecutar = (function(arg) {
  return $m_Lvision_PuenteJS$().hf(arg);
});
export { $e_sculptEjecutar as sculptEjecutar };
