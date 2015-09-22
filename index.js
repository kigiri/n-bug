const Args = require('minimist')(process.argv.slice(2));
const Path = require("path");
const appDirLength = __dirname.length - 19;
const Pretty = require("prettyjson");

const makeColor = colorCode => '\u001b[' + colorCode + 'm';

const Colors = {
  red: makeColor(31),
  none: makeColor(39),
  blue: makeColor(34),
  cyan: makeColor(36),
  grey: makeColor(90),
  black: makeColor(30),
  white: makeColor(37),
  green: makeColor(32),
  yellow: makeColor(33),
  magenta: makeColor(35)
};

const RandomColors = [
  Colors.red,
  Colors.blue,
  Colors.cyan,
  Colors.green,
  Colors.yellow,
  Colors.magenta
];

const Types = {
  info: { color: Colors.grey, lvl:4 },
  log: { color: Colors.cyan, lvl:3 },
  warn: { color: Colors.yellow, lvl:2 },
  error: { color: Colors.red, lvl:1 }
};

function hashString(str){
  let hash = 0, i = -1;

  while (++i < str.length) {
    hash = str.charCodeAt(i) + (hash << 6) + (hash << 16) - hash;
  }

  return Math.abs(hash);
}

function getColor(prevIndex) {
  const max = RandomColors.length;
  return str => {
    let index = hashString(str) % max;
    if (index === prevIndex) {
      index++;
      if (index > max) {
        index = 0;
      }
    }
    prevIndex = index;
    return RandomColors[index];
  };
}

const cleanupPath = str =>
  str.slice(appDirLength, -Path.extname(str).length);

function logMaker(type, coloredKey) {
  if (Types[type].lvl > Args.dlvl) { return () => {} }
  let prevCallTime = getMicroTime();
  const msgBase = Types[type].color + type;
  const messenger = typeof console[type] === "function"
    ? console[type] : console.log;
  const prettyOpts = {
    inlineArrays: true,
    keysColor: 'yellow',
    dashColor: 'magenta',
    stringColor: 'green'
  };

  return () => {
    let newTime = getMicroTime();
    let msg = msgBase;

    msg += (Args.dnotime) ? " " : parseTimeDiff(newTime - prevCallTime);

    process.stdout.write(msg + coloredKey + Colors.none +" ");
    prevCallTime = newTime;
    if (!Args.dpretty) {
      messenger.apply(console, arguments);
    } else {
      let argList = new Array(arguments.length), i = -1;
      while (++i < arguments.length) {
        argList[i] = (typeof arguments === "object")
          ? Pretty.render(arguments[i], prettyOpts)
          : arguments[i];
      }
      messenger.apply(console, argList);
    }
  }
}

const ms = 1000;
const sec = ms * 1000;

const getMicroTime = () => {
  let t = process.hrtime();
  return t[0] * sec + ~~(t[1] / ms);
};

function addSpacePadding(count) {
  let total = ' ';
  while (count-- > 0) {
    total += ' ';
  }
  return total;
}

function formatNumber(value) {
  value = Math.round(value).toString();
  return addSpacePadding(3 - value.length) + value;
}

function parseTimeDiff(diff) {
  if (diff < ms) {
    return Colors.green + formatNumber(diff) + Colors.grey +"µs ";
  }
  if (diff < sec) {
    return Colors.cyan + formatNumber(diff / ms) + Colors.grey +"ms ";
  }
  if (diff < sec * 1000) {
    return Colors.yellow + formatNumber(diff / sec) + Colors.grey +"s  ";
  }
  return " 999"+ Colors.grey +"+s ";
};

const ignoreLog = () => {};
Object.keys(Types).forEach(type => ignoreLog[type] = () => {});

function debug(fullpath, blackList) {
  fullpath = cleanupPath(fullpath);
  if (!showKey(fullpath) || Args.dlvl < 1) { return ignoreLog }

  let getColorLocal = getColor(-1);

  const coloredKey = fullpath.split(Path.sep)
    .filter(pathPart => pathPart && pathPart.length)
    .map(pathPart => getColorLocal(pathPart) + pathPart)
    .join(Colors.grey +'/');

  let debugMessager = logMaker("log", coloredKey);

  Object.keys(Types).forEach(type => {
    debugMessager[type] = logMaker(type, coloredKey);
    debugMessager[type[0]] = debugMessager[type];
  });
  return debugMessager;
};

// Set Defaults arg values
if (typeof Args.dlvl !== "number") {
  Args.dlvl = (Args.p || Args.production) ? 0 : 3;
}

let showKey = key => true;

if (typeof Args.dmatch === "string") {
  let reg;
  try {
    reg = new RegExp(Args.dmatch);
  } catch (err) {
    return;
  }
  showKey = key => reg.test(key);
}

debug.args = Args;

module.exports = debug;

/*

dnotime
  -- append time elapsed between each messages

  boolean

dpretty
  -- Enable Colorfull Object logs (buggy)

  boolean

dmatch
  -- filter

  regex

  defaults *

dlvl
  0       1     2      3    4
  nothing error warn   log  info
          red   yellow blue grey

  defaults
    prod : 0
    dev  : 3

*/
