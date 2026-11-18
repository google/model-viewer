var balanced = require('balanced-match')

module.exports = expandTop

var escSlash = '\0SLASH' + Math.random().toFixed(16) + '\0'
var escOpen = '\0OPEN' + Math.random().toFixed(16) + '\0'
var escClose = '\0CLOSE' + Math.random().toFixed(16) + '\0'
var escComma = '\0COMMA' + Math.random().toFixed(16) + '\0'
var escPeriod = '\0PERIOD' + Math.random().toFixed(16) + '\0'

var EXPANSION_MAX = 100000

// `EXPANSION_MAX` caps the *number* of expansions, but not their length. An
// input like `'{a,b}'.repeat(1500)` stays under that count - its output is
// truncated to 100k results - while making every result ~1500 characters
// long. The result set, and the intermediate arrays built while combining
// brace sets, then grow large enough to exhaust memory and crash the process
// (CVE-2026-14257). `EXPANSION_MAX_LENGTH` bounds the total number of
// characters the accumulator may hold at any point, so memory stays flat no
// matter how many brace groups are chained. The limit sits well above any
// realistic expansion (100k results hitting `EXPANSION_MAX` measure ~1M
// characters) so legitimate input is unaffected.
var EXPANSION_MAX_LENGTH = 4000000

// `expand` recurses once per level of brace *nesting* - both when expanding a
// set's comma members and when re-wrapping a set whose body is a single part.
// The CVE-2026-14257 fix made the *tail* iterative (recursion on `m.post`, one
// level per chained group), which left nesting depth unbounded: about 3,100
// levels of `{{{...a,b...}}}` - only ~6KB of input - exhausted the native stack
// and crashed the process. `EXPANSION_MAX_DEPTH` bounds how deep the parser
// will follow nesting. It sits far above any realistic pattern and well below
// the depth at which the stack runs out.
var EXPANSION_MAX_DEPTH = 1000

// Bash keeps a quirk where a brace group followed by a comma set still expands
// (`{a},b}`). The parser implements it by rewriting the string and restarting
// the scan, absorbing one `}` per pass. `n` trailing braces therefore cost `n`
// full passes over a string that itself grows by one `escClose` sentinel each
// time - quadratic in `n`, with a ~26x constant from the sentinel's length.
// 128KB of `'{a}' + '}'.repeat(n) + ',z}'` blocked the event loop for 27
// seconds to produce two results. `EXPANSION_MAX_REWRITES` bounds how many
// times the scan may restart. Real `{a},b}` input needs a handful.
var EXPANSION_MAX_REWRITES = 1000

// `EXPANSION_MAX_STEPS` bounds the work one `expandTop` call does, which `max`,
// `maxLength` and `maxDepth` don't: nested sets are rescanned at every level
// and chained groups each rebuild up to `max` results, so 2KB of input could
// block the event loop for over 30 seconds. Each character scanned, result
// built and sequence value generated is a step, and each `expand` call costs
// `CALL_STEPS` more. Past the budget, the set being expanded and everything
// after it stay literal. A glob needs a few hundred steps, and nesting all the
// way to `EXPANSION_MAX_DEPTH` about 4M.
var EXPANSION_MAX_STEPS = 20000000

// What one `expand` call costs on top of what it scans and builds. Setting
// one up takes about as long as scanning 16 characters, and a set whose
// results are wrapped to be expanded again makes one call per result, each
// scanning and building next to nothing: 64KB of
// `('{{' + ','.repeat(316) + '}{' + ','.repeat(316) + '}}').repeat(n)` made
// 4M such calls, which spent the budget three times as slowly as anything
// else.
var CALL_STEPS = 16

function numeric(str) {
  return parseInt(str, 10) == str ? parseInt(str, 10) : str.charCodeAt(0)
}

function escapeBraces(str) {
  return str
    .split('\\\\')
    .join(escSlash)
    .split('\\{')
    .join(escOpen)
    .split('\\}')
    .join(escClose)
    .split('\\,')
    .join(escComma)
    .split('\\.')
    .join(escPeriod)
}

function unescapeBraces(str) {
  return str
    .split(escSlash)
    .join('\\')
    .split(escOpen)
    .join('{')
    .split(escClose)
    .join('}')
    .split(escComma)
    .join(',')
    .split(escPeriod)
    .join('.')
}

// Like `target.push(...items)` but doesn't overflow the stack
function pushAll(target, items) {
  for (var i = 0; i < items.length; i++) {
    target.push(items[i])
  }
}

// `budget` is `{ remaining }`, one counter shared by every level and group of
// an `expandTop` call, so the bound holds for the call as a whole.
//
// `balanced`, run on `masked` (see `maskUnmatchedOpens`), sliced from `str`
// and charged for the characters it walks: up to the group's `}`, or the
// whole string when there is no match or unmatched `{` come first, which
// `unmatched` then flags for masking. Once a call overdraws the budget, it
// and every later one return undefined, so the rest stays literal.
function balancedWithBudget(str, masked, budget) {
  if (budget.remaining < 0) {
    return undefined
  }
  var r = balanced.range('{', '}', masked)
  var unmatched = r !== undefined && masked.indexOf('{') < r[0]
  budget.remaining -= r && !unmatched ? r[1] + 1 : str.length
  if (!r || budget.remaining < 0) {
    return undefined
  }
  return {
    end: r[1],
    pre: str.slice(0, r[0]),
    body: str.slice(r[0] + 1, r[1]),
    post: str.slice(r[1] + 1),
    unmatched: unmatched,
  }
}

// `masked` with every `{` that has no matching `}` swapped for a `\0`, which
// keeps the length, so a scan of it still lines up with the string it was
// made from. Such a `{` is literal either way, but `balanced` only learns that
// one is unmatched by reading to the end of the string, so with one at the
// head of every group (`'{a,{b,c}'.repeat(n)`) each scan read the rest of the
// input. That was quadratic, and once the step budget charged for it, it ran
// out partway through and left the rest literal. A scan of the masked copy
// stops at the group's `}`. It is one pass, charged as such.
function maskUnmatchedOpens(masked, budget) {
  budget.remaining -= masked.length
  var open = []
  for (var i = 0; i < masked.length; i++) {
    var c = masked.charCodeAt(i)
    if (c === 0x7b) {
      open.push(i)
    } else if (c === 0x7d && open.length) {
      open.pop()
    }
  }
  var out = ''
  var last = 0
  for (var j = 0; j < open.length; j++) {
    out += masked.slice(last, open[j]) + '\0'
    last = open[j] + 1
  }
  return out + masked.slice(last)
}

// Whether `str` has a `,` not followed by another `,`, with a `}` after it on
// the same line - what `/,(?!,).*\}/.test(str)` asks, answered in one pass from
// the end. The regex tries every `,` and backtracks through the rest of its
// line from each, which is quadratic, and the `{a},b}` rewrite asks again on
// every pass. Like a scan, it is charged for the whole string and refused if
// that overdraws the budget.
function commaSetFollows(str, budget) {
  budget.remaining -= str.length
  if (budget.remaining < 0) {
    return false
  }
  // Whether a `}` follows the current position before the line ends
  var close = false
  for (var i = str.length - 1; i >= 0; i--) {
    var c = str.charCodeAt(i)
    if (c === 0x7d) {
      close = true
    } else if (c === 0x0a || c === 0x0d || c === 0x2028 || c === 0x2029) {
      // A line terminator, which `.` does not match
      close = false
    } else if (c === 0x2c && close && str.charCodeAt(i + 1) !== 0x2c) {
      return true
    }
  }
  return false
}

// Basically just str.split(","), but handling cases
// where we have nested braced sections, which should be
// treated as individual members, like {a,{b,c},d}
//
// Returns `undefined` if the step budget runs out before the whole set is
// split, since splitting what is left on every comma would tear apart the
// nested sets it still holds.
function parseCommaParts(str, budget) {
  var parts = []

  // Walk the brace groups iteratively. Recursing on `post` once per group let a
  // chain of them exhaust the stack - the parsing-side counterpart to
  // the `expand` overflow fixed for CVE-2026-14257, and not something `max` or
  // `maxLength` can bound, since it happens before expansion.
  //
  // The part the next chunk continues
  var carry = ''

  for (;;) {
    // A set's body holds no unmatched `{`, so there is nothing to mask.
    var m = balancedWithBudget(str, str, budget)

    if (budget.remaining < 0) {
      return undefined
    }

    if (!m) {
      var tail = str.split(',')
      tail[0] = carry + tail[0]
      pushAll(parts, tail)
      return parts
    }

    var pre = m.pre
    var body = m.body
    var post = m.post
    var p = pre.split(',')

    p[0] = carry + p[0]
    p[p.length - 1] += '{' + body + '}'

    if (!post.length) {
      pushAll(parts, p)
      return parts
    }

    carry = p.pop()
    pushAll(parts, p)
    str = post
  }
}

// An option that is left out or null, or that is NaN, gets its default. Every
// comparison against NaN is false, so a NaN bound would never be reached:
// `{ maxSteps: NaN }` let 15KB of input block the event loop for 16 seconds,
// and `{ maxDepth: NaN }` overflowed the stack again (CVE-2026-102278). Pass
// `Infinity` to lift a bound.
function bound(value, fallback) {
  return value == null || isNaN(value) ? fallback : value
}

function expandTop(str, options) {
  if (!str) return []

  options = options || {}
  var max = bound(options.max, EXPANSION_MAX)
  var maxLength = bound(options.maxLength, EXPANSION_MAX_LENGTH)
  var maxDepth = bound(options.maxDepth, EXPANSION_MAX_DEPTH)
  var maxRewrites = bound(options.maxRewrites, EXPANSION_MAX_REWRITES)
  var maxSteps = bound(options.maxSteps, EXPANSION_MAX_STEPS)

  // I don't know why Bash 4.3 does this, but it does.
  // Anything starting with {} will have the first two bytes preserved
  // but *only* at the top level, so {},a}b will not expand to anything,
  // but a{},b}c will be expanded to [a}c,abc].
  // One could argue that this is a bug in Bash, but since the goal of
  // this module is to match Bash's rules, we escape a leading {}
  if (str.substr(0, 2) === '{}') {
    str = '\\{\\}' + str.substr(2)
  }

  return expand(
    escapeBraces(str),
    max,
    maxLength,
    maxDepth,
    0,
    maxRewrites,
    { remaining: maxSteps },
    true
  ).map(unescapeBraces)
}

function embrace(str) {
  return '{' + str + '}'
}
function isPadded(el) {
  return /^-?0\d/.test(el)
}

function lte(i, y) {
  return i <= y
}
function gte(i, y) {
  return i >= y
}

// Build `{ acc[a] + pre + values[v] }` for every combination, capping the
// number of results at `max` and the total number of characters at `maxLength`.
// This is the one place output grows, so bounding it here keeps the single
// accumulator - and therefore memory - flat regardless of how many brace groups
// are combined (CVE-2026-14257). Each result built is a step, since `max` and
// `maxLength` bound one combination, not how many brace groups are combined.
function combine(acc, pre, values, max, maxLength, dropEmpties, budget) {
  var out = []
  var length = 0
  // Bash drops empty results at the top level, and they don't count against
  // `max`, so `max` bounds the number of *kept* results. Only an empty
  // `acc[a] + pre` can make one, so for those the empty values are skipped
  // without being visited. Visiting them one at a time let a set of empties
  // cost `acc.length * values.length` while keeping nothing.
  var nonEmpty
  outer: for (var a = 0; a < acc.length; a++) {
    var prefix = acc[a] + pre
    var vs = values
    if (dropEmpties && !prefix) {
      if (!nonEmpty) nonEmpty = values.filter(Boolean)
      vs = nonEmpty
    }
    for (var v = 0; v < vs.length; v++) {
      if (out.length >= max) break outer
      var expansion = prefix + vs[v]
      if (length + expansion.length > maxLength) break outer
      out.push(expansion)
      length += expansion.length
    }
  }
  budget.remaining -= out.length
  return out
}

// The expansion values of a single numeric (`1..5`) or alphabetic (`a..e..2`)
// sequence body, or `undefined` if the step budget runs out generating them.
function expandSequence(body, isAlphaSequence, max, maxLength, budget) {
  var n = body.split(/\.\./)
  var N = []
  // A sequence body always splits into two or three parts, but the compiler
  // can't know that.
  /* c8 ignore start */
  if (n[0] === undefined || n[1] === undefined) {
    return N
  }
  /* c8 ignore stop */
  var x = numeric(n[0])
  var y = numeric(n[1])
  var width = Math.max(n[0].length, n[1].length)
  var incr =
    n.length === 3 && n[2] !== undefined ?
      Math.max(Math.abs(numeric(n[2])), 1)
    : 1
  var test = lte
  var reverse = y < x
  if (reverse) {
    incr *= -1
    test = gte
  }
  var pad = n.some(isPadded)
  // A padded value is built a character at a time to `width`, which the input
  // sets, so it costs one step per character: 64KB of
  // `('{' + '0'.repeat(100) + '..99999}').repeat(n)` took 7 seconds charged
  // one step per value.
  var cost = pad ? width : 1

  var length = 0
  for (var i = x; test(i, y) && N.length < max; i += incr) {
    // Each value is a step. `max` and `maxLength` bound one sequence, but a
    // chain of them still generated up to `max` values each, however few
    // combining could keep.
    budget.remaining -= cost
    if (budget.remaining < 0) {
      return undefined
    }
    var c
    if (isAlphaSequence) {
      c = String.fromCharCode(i)
      if (c === '\\') {
        c = ''
      }
    } else {
      c = String(i)
      if (pad) {
        var need = width - c.length
        if (need > 0) {
          var z = new Array(need + 1).join('0')
          if (i < 0) {
            c = '-' + z + c.slice(1)
          } else {
            c = z + c
          }
        }
      }
    }
    if (length + c.length > maxLength) break
    N.push(c)
    length += c.length
  }
  return N
}

function expand(
  str,
  max,
  maxLength,
  maxDepth,
  depth,
  maxRewrites,
  budget,
  isTop
) {
  // An overdraft here makes the first scan refuse, so `str` stays literal.
  budget.remaining -= CALL_STEPS

  // Too deeply nested to keep following: treat the rest as literal, the same
  // way a group that cannot expand is already handled. Truncating rather than
  // throwing keeps expansion total, matching `max` and `maxLength`.
  if (depth > maxDepth) {
    return [str]
  }

  // Consume the string's top-level brace groups left to right, threading a
  // running set of combined prefixes (`acc`). Expanding the tail iteratively -
  // rather than recursing on `m.post` once per group - keeps the native stack
  // depth constant, so deeply chained input (`'{a,b}'.repeat(3000)`) can no
  // longer overflow the stack, and leaves a single accumulator whose size
  // `maxLength` bounds directly (CVE-2026-14257).
  var acc = ['']

  // Bash drops empty results, but only when the *first* top-level group is a
  // comma set - a sequence like `{a..\}` may legitimately yield ''. The drop
  // is on the final strings, so it is applied to whichever `combine` produces
  // them (the one with no brace set left in the tail).
  // How many times the `{a},b}` rewrite below has restarted the scan. Each pass
  // re-reads the whole string, so leaving this unbounded is quadratic.
  var rewrites = 0
  var dropEmpties = false
  var firstGroup = true
  // `str` with its unmatched `{` masked, once a scan has run into them
  var masked = str

  for (;;) {
    const m = balancedWithBudget(str, masked, budget)

    // No brace set left, or no step budget left to look for one: the rest of
    // the string is literal.
    if (!m) {
      return combine(acc, str, [''], max, maxLength, dropEmpties, budget)
    }
    if (m.unmatched) {
      masked = maskUnmatchedOpens(masked, budget)
    }

    // no need to expand pre, since it is guaranteed to be free of brace-sets
    const pre = m.pre

    // This set and the rest of the string, literal: for a set that cannot
    // expand, and for one the step budget runs out on. Once it is overdrawn,
    // every set still being expanded, at every level, stays literal like this -
    // otherwise each level above would go on combining, and wrapping and
    // expanding again, results the budget was too small for.
    var literal = function () {
      return combine(
        acc,
        pre + '{' + m.body + '}' + m.post,
        [''],
        max,
        maxLength,
        dropEmpties,
        budget
      )
    }

    if (/\$$/.test(pre)) {
      acc = combine(
        acc,
        pre + '{' + m.body + '}',
        [''],
        max,
        maxLength,
        dropEmpties && !m.post.length,
        budget
      )
      firstGroup = false
      if (!m.post.length) break
      str = m.post
      masked = masked.slice(m.end + 1)
      continue
    }

    var isNumericSequence = /^-?\d+\.\.-?\d+(?:\.\.-?\d+)?$/.test(m.body)
    var isAlphaSequence = /^[a-zA-Z]\.\.[a-zA-Z](?:\.\.-?\d+)?$/.test(
      m.body
    )
    var isSequence = isNumericSequence || isAlphaSequence
    var isOptions = m.body.indexOf(',') >= 0
    if (!isSequence && !isOptions) {
      // {a},b}
      if (rewrites < maxRewrites && commaSetFollows(m.post, budget)) {
        rewrites++
        str = m.pre + '{' + m.body + escClose + m.post
        // Taking a `}` away never gives an unmatched `{` a partner, so what
        // is masked stays unmatched. The `{` it closed can be left without
        // one, and the next scan masks it.
        masked =
          masked.slice(0, m.end) + escClose + masked.slice(m.end + 1)
        isTop = true
        continue
      }
      // Nothing here expands, so the whole remaining string is literal.
      return literal()
    }

    if (firstGroup) {
      dropEmpties = isTop && !isSequence
      firstGroup = false
    }

    var values
    if (isSequence) {
      values = expandSequence(
        m.body,
        isAlphaSequence,
        max,
        maxLength,
        budget
      )
      if (!values) {
        return literal()
      }
    } else {
      var n = parseCommaParts(m.body, budget)
      // The step budget ran out partway through the set.
      if (!n) {
        return literal()
      }
      if (n.length === 1 && n[0] !== undefined) {
        // x{{a,b}}y ==> x{a}y x{b}y
        n = expand(
          n[0],
          max,
          maxLength,
          maxDepth,
          depth + 1,
          maxRewrites,
          budget,
          false
        ).map(embrace)
        // The step budget ran out expanding the set's only part.
        if (budget.remaining < 0) {
          return literal()
        }
        //XXX is this necessary? Can't seem to hit it in tests.
        /* c8 ignore start */
        if (n.length === 1) {
          var single = combine(
            acc,
            pre + n[0],
            [''],
            max,
            maxLength,
            dropEmpties && !m.post.length,
            budget
          )
          if (budget.remaining < 0) {
            return literal()
          }
          acc = single
          if (!m.post.length) break
          str = m.post
          masked = masked.slice(m.end + 1)
          continue
        }
        /* c8 ignore stop */
      }

      // Values that `combine` is going to drop as empty produce no result, so
      // they must not count against `max` - otherwise `{a,,b}` with `max: 2`
      // would stop at `['a', '']` and yield one result instead of two. Skipping
      // them outright keeps `values` bounded while leaving `max` a bound on
      // *kept* results.
      var dropsEmpties = dropEmpties && !m.post.length && !pre
      for (var d = 0; dropsEmpties && d < acc.length; d++) {
        if (acc[d]) {
          dropsEmpties = false
        }
      }

      values = []
      var valuesLength = 0
      outer: for (var j = 0; j < n.length; j++) {
        var expanded = expand(
          n[j],
          max,
          maxLength,
          maxDepth,
          depth + 1,
          maxRewrites,
          budget,
          false
        )
        // The step budget ran out expanding a member.
        if (budget.remaining < 0) {
          return literal()
        }
        for (var k = 0; k < expanded.length; k++) {
          var v = expanded[k]
          if (dropsEmpties && !v) continue
          if (
            values.length >= max ||
            valuesLength + v.length > maxLength
          ) {
            break outer
          }
          values.push(v)
          valuesLength += v.length
        }
      }
    }

    var next = combine(
      acc,
      pre,
      values,
      max,
      maxLength,
      dropEmpties && !m.post.length,
      budget
    )
    // The step budget ran out combining the set's values in.
    if (budget.remaining < 0) {
      return literal()
    }
    acc = next
    if (!m.post.length) break
    str = m.post
    masked = masked.slice(m.end + 1)
  }

  return acc
}
