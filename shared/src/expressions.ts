/**
 * SwissKnife Expression Engine — Safe evaluator for {{expressions}} in JSON specs.
 *
 * Supports:
 *   - Path access:        {{user.profile.name}}, {{items[0].title}}
 *   - Array methods:      {{items.length}}, {{items.filter(done).length}}
 *   - String methods:     {{name.toUpperCase()}}, {{text.trim()}}, {{text.slice(0,5)}}
 *   - Math:               {{price * quantity}}, {{total + tax}}, {{score / max * 100}}
 *   - Comparisons:        {{score > 80}}, {{status == "active"}}
 *   - Ternary:            {{score >= 50 ? "Pass" : "Fail"}}
 *   - Pipes:              {{price | toFixed(2)}}, {{name | uppercase}}
 *   - Literals:           {{42}}, {{"hello"}}, {{true}}, {{null}}
 *
 * Security: NO eval(), NO Function(), NO access to globalThis/window/process.
 * This is a hand-written recursive-descent parser operating on a token stream.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Context = Record<string, unknown>;

// ---------------------------------------------------------------------------
// Token types for the lexer
// ---------------------------------------------------------------------------

const enum TokenType {
  Number,
  String,
  Boolean,
  Null,
  Identifier,
  Dot,
  LBracket,
  RBracket,
  LParen,
  RParen,
  Comma,
  Plus,
  Minus,
  Star,
  Slash,
  Percent,
  Eq,
  Neq,
  Gt,
  Gte,
  Lt,
  Lte,
  And,
  Or,
  Not,
  Question,
  Colon,
  Pipe,
  EOF,
}

interface Token {
  type: TokenType;
  value: string | number | boolean | null;
  raw: string;
}

// ---------------------------------------------------------------------------
// Lexer
// ---------------------------------------------------------------------------

function tokenize(input: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;

  while (i < input.length) {
    const ch = input[i];

    // Whitespace
    if (ch === " " || ch === "\t" || ch === "\n" || ch === "\r") {
      i++;
      continue;
    }

    // Numbers (integer or float)
    if ((ch >= "0" && ch <= "9") || (ch === "." && i + 1 < input.length && input[i + 1] >= "0" && input[i + 1] <= "9")) {
      let num = "";
      while (i < input.length && ((input[i] >= "0" && input[i] <= "9") || input[i] === ".")) {
        num += input[i++];
      }
      tokens.push({ type: TokenType.Number, value: parseFloat(num), raw: num });
      continue;
    }

    // Strings (single or double quoted)
    if (ch === '"' || ch === "'") {
      const quote = ch;
      i++; // skip opening quote
      let str = "";
      while (i < input.length && input[i] !== quote) {
        if (input[i] === "\\" && i + 1 < input.length) {
          i++; // skip backslash
          str += input[i];
        } else {
          str += input[i];
        }
        i++;
      }
      i++; // skip closing quote
      tokens.push({ type: TokenType.String, value: str, raw: `${quote}${str}${quote}` });
      continue;
    }

    // Identifiers and keywords
    if ((ch >= "a" && ch <= "z") || (ch >= "A" && ch <= "Z") || ch === "_" || ch === "$") {
      let ident = "";
      while (i < input.length && ((input[i] >= "a" && input[i] <= "z") || (input[i] >= "A" && input[i] <= "Z") || (input[i] >= "0" && input[i] <= "9") || input[i] === "_" || input[i] === "$")) {
        ident += input[i++];
      }
      if (ident === "true") {
        tokens.push({ type: TokenType.Boolean, value: true, raw: ident });
      } else if (ident === "false") {
        tokens.push({ type: TokenType.Boolean, value: false, raw: ident });
      } else if (ident === "null") {
        tokens.push({ type: TokenType.Null, value: null, raw: ident });
      } else {
        tokens.push({ type: TokenType.Identifier, value: ident, raw: ident });
      }
      continue;
    }

    // Two-character operators
    if (i + 1 < input.length) {
      const two = ch + input[i + 1];
      if (two === "==") { tokens.push({ type: TokenType.Eq, value: "==", raw: two }); i += 2; continue; }
      if (two === "!=") { tokens.push({ type: TokenType.Neq, value: "!=", raw: two }); i += 2; continue; }
      if (two === ">=") { tokens.push({ type: TokenType.Gte, value: ">=", raw: two }); i += 2; continue; }
      if (two === "<=") { tokens.push({ type: TokenType.Lte, value: "<=", raw: two }); i += 2; continue; }
      if (two === "&&") { tokens.push({ type: TokenType.And, value: "&&", raw: two }); i += 2; continue; }
      if (two === "||") { tokens.push({ type: TokenType.Or, value: "||", raw: two }); i += 2; continue; }
    }

    // Single-character operators
    switch (ch) {
      case ".": tokens.push({ type: TokenType.Dot, value: ".", raw: ch }); break;
      case "[": tokens.push({ type: TokenType.LBracket, value: "[", raw: ch }); break;
      case "]": tokens.push({ type: TokenType.RBracket, value: "]", raw: ch }); break;
      case "(": tokens.push({ type: TokenType.LParen, value: "(", raw: ch }); break;
      case ")": tokens.push({ type: TokenType.RParen, value: ")", raw: ch }); break;
      case ",": tokens.push({ type: TokenType.Comma, value: ",", raw: ch }); break;
      case "+": tokens.push({ type: TokenType.Plus, value: "+", raw: ch }); break;
      case "-": tokens.push({ type: TokenType.Minus, value: "-", raw: ch }); break;
      case "*": tokens.push({ type: TokenType.Star, value: "*", raw: ch }); break;
      case "/": tokens.push({ type: TokenType.Slash, value: "/", raw: ch }); break;
      case "%": tokens.push({ type: TokenType.Percent, value: "%", raw: ch }); break;
      case ">": tokens.push({ type: TokenType.Gt, value: ">", raw: ch }); break;
      case "<": tokens.push({ type: TokenType.Lt, value: "<", raw: ch }); break;
      case "!": tokens.push({ type: TokenType.Not, value: "!", raw: ch }); break;
      case "?": tokens.push({ type: TokenType.Question, value: "?", raw: ch }); break;
      case ":": tokens.push({ type: TokenType.Colon, value: ":", raw: ch }); break;
      case "|": tokens.push({ type: TokenType.Pipe, value: "|", raw: ch }); break;
      default:
        // Unknown character — skip
        break;
    }
    i++;
  }

  tokens.push({ type: TokenType.EOF, value: null, raw: "" });
  return tokens;
}

// ---------------------------------------------------------------------------
// Parser — recursive descent, produces a value directly (interpreter)
// ---------------------------------------------------------------------------

class ExpressionParser {
  private tokens: Token[];
  private pos: number;
  private ctx: Context;

  constructor(tokens: Token[], ctx: Context) {
    this.tokens = tokens;
    this.pos = 0;
    this.ctx = ctx;
  }

  private peek(): Token {
    return this.tokens[this.pos] ?? { type: TokenType.EOF, value: null, raw: "" };
  }

  private advance(): Token {
    const t = this.tokens[this.pos];
    this.pos++;
    return t;
  }

  private expect(type: TokenType): Token {
    const t = this.peek();
    if (t.type !== type) {
      throw new Error(`Expected token type ${type}, got ${t.type} (${t.raw})`);
    }
    return this.advance();
  }

  // Entry point
  parse(): unknown {
    const result = this.parseTernary();
    return result;
  }

  // Ternary: expr ? expr : expr
  private parseTernary(): unknown {
    const condition = this.parseOr();
    if (this.peek().type === TokenType.Question) {
      this.advance(); // skip ?
      const consequent = this.parseTernary();
      this.expect(TokenType.Colon);
      const alternate = this.parseTernary();
      return condition ? consequent : alternate;
    }
    return condition;
  }

  // Logical OR: expr || expr
  private parseOr(): unknown {
    let left = this.parseAnd();
    while (this.peek().type === TokenType.Or) {
      this.advance();
      const right = this.parseAnd();
      left = left || right;
    }
    return left;
  }

  // Logical AND: expr && expr
  private parseAnd(): unknown {
    let left = this.parseComparison();
    while (this.peek().type === TokenType.And) {
      this.advance();
      const right = this.parseComparison();
      left = left && right;
    }
    return left;
  }

  // Comparison: expr == != > >= < <= expr
  private parseComparison(): unknown {
    let left = this.parseAddSub();
    while (true) {
      const t = this.peek();
      if (t.type === TokenType.Eq) { this.advance(); left = left === this.parseAddSub(); }
      else if (t.type === TokenType.Neq) { this.advance(); left = left !== this.parseAddSub(); }
      else if (t.type === TokenType.Gt) { this.advance(); left = (left as number) > (this.parseAddSub() as number); }
      else if (t.type === TokenType.Gte) { this.advance(); left = (left as number) >= (this.parseAddSub() as number); }
      else if (t.type === TokenType.Lt) { this.advance(); left = (left as number) < (this.parseAddSub() as number); }
      else if (t.type === TokenType.Lte) { this.advance(); left = (left as number) <= (this.parseAddSub() as number); }
      else break;
    }
    return left;
  }

  // Addition/Subtraction: expr +/- expr
  private parseAddSub(): unknown {
    let left = this.parseMulDiv();
    while (true) {
      const t = this.peek();
      if (t.type === TokenType.Plus) {
        this.advance();
        const right = this.parseMulDiv();
        // String concatenation if either side is string
        if (typeof left === "string" || typeof right === "string") {
          left = String(left ?? "") + String(right ?? "");
        } else {
          left = (left as number) + (right as number);
        }
      } else if (t.type === TokenType.Minus) {
        this.advance();
        left = (left as number) - (this.parseMulDiv() as number);
      } else break;
    }
    return left;
  }

  // Multiplication/Division/Modulo: expr * / % expr
  private parseMulDiv(): unknown {
    let left = this.parseUnary();
    while (true) {
      const t = this.peek();
      if (t.type === TokenType.Star) { this.advance(); left = (left as number) * (this.parseUnary() as number); }
      else if (t.type === TokenType.Slash) {
        this.advance();
        const divisor = this.parseUnary() as number;
        left = divisor !== 0 ? (left as number) / divisor : 0;
      }
      else if (t.type === TokenType.Percent) { this.advance(); left = (left as number) % (this.parseUnary() as number); }
      else break;
    }
    return left;
  }

  // Unary: !expr, -expr
  private parseUnary(): unknown {
    if (this.peek().type === TokenType.Not) {
      this.advance();
      return !this.parseUnary();
    }
    if (this.peek().type === TokenType.Minus) {
      this.advance();
      return -(this.parseUnary() as number);
    }
    return this.parsePipeOrPostfix();
  }

  // Pipe: expr | pipeFn(args)
  private parsePipeOrPostfix(): unknown {
    let value = this.parsePostfix();

    while (this.peek().type === TokenType.Pipe) {
      this.advance(); // skip |
      const fnName = this.expect(TokenType.Identifier).value as string;
      let args: unknown[] = [];
      if (this.peek().type === TokenType.LParen) {
        this.advance(); // skip (
        args = this.parseArgList();
        this.expect(TokenType.RParen);
      }
      value = applyPipe(value, fnName, args);
    }

    return value;
  }

  // Postfix: member access, indexing, method calls
  private parsePostfix(): unknown {
    let value = this.parsePrimary();

    while (true) {
      const t = this.peek();

      // Dot access: value.property or value.method(args)
      if (t.type === TokenType.Dot) {
        this.advance();
        const prop = this.expect(TokenType.Identifier).value as string;

        // Check for method call: value.method(args)
        if (this.peek().type === TokenType.LParen) {
          this.advance(); // skip (
          const args = this.parseArgList();
          this.expect(TokenType.RParen);
          value = applyMethod(value, prop, args, this.ctx);
        } else {
          // Property access
          value = getProperty(value, prop);
        }
        continue;
      }

      // Bracket access: value[expr]
      if (t.type === TokenType.LBracket) {
        this.advance();
        const index = this.parseTernary();
        this.expect(TokenType.RBracket);
        if (value != null && typeof value === "object") {
          value = (value as any)[index as string | number];
        } else {
          value = undefined;
        }
        continue;
      }

      break;
    }

    return value;
  }

  // Primary: literals, identifiers, grouped expressions
  private parsePrimary(): unknown {
    const t = this.peek();

    // Grouped expression
    if (t.type === TokenType.LParen) {
      this.advance();
      const value = this.parseTernary();
      this.expect(TokenType.RParen);
      return value;
    }

    // Literals
    if (t.type === TokenType.Number) { this.advance(); return t.value; }
    if (t.type === TokenType.String) { this.advance(); return t.value; }
    if (t.type === TokenType.Boolean) { this.advance(); return t.value; }
    if (t.type === TokenType.Null) { this.advance(); return null; }

    // Identifier — look up in context
    if (t.type === TokenType.Identifier) {
      this.advance();
      const name = t.value as string;

      // Built-in constants
      if (name === "undefined") return undefined;
      if (name === "Math") return SAFE_MATH;
      if (name === "JSON") return SAFE_JSON;
      if (name === "Date") return SAFE_DATE;
      if (name === "Array") return SAFE_ARRAY;
      if (name === "String") return SAFE_STRING;
      if (name === "Number") return SAFE_NUMBER;
      if (name === "Object") return SAFE_OBJECT;

      // Context lookup
      return this.ctx[name];
    }

    // If we get here, return undefined for unknown tokens
    this.advance();
    return undefined;
  }

  // Parse comma-separated argument list
  private parseArgList(): unknown[] {
    const args: unknown[] = [];
    if (this.peek().type === TokenType.RParen) return args;

    args.push(this.parseTernary());
    while (this.peek().type === TokenType.Comma) {
      this.advance();
      args.push(this.parseTernary());
    }
    return args;
  }
}

// ---------------------------------------------------------------------------
// Safe built-in objects (whitelisted methods only)
// ---------------------------------------------------------------------------

const SAFE_MATH = {
  abs: Math.abs,
  ceil: Math.ceil,
  floor: Math.floor,
  round: Math.round,
  min: Math.min,
  max: Math.max,
  pow: Math.pow,
  sqrt: Math.sqrt,
  random: Math.random,
  PI: Math.PI,
  E: Math.E,
};

const SAFE_JSON = {
  stringify: (v: unknown) => JSON.stringify(v),
  parse: (s: string) => { try { return JSON.parse(s); } catch { return null; } },
};

const SAFE_DATE = {
  now: () => Date.now(),
  toISO: () => new Date().toISOString(),
};

const SAFE_ARRAY = {
  isArray: Array.isArray,
};

const SAFE_STRING = {
  fromCharCode: String.fromCharCode,
};

const SAFE_NUMBER = {
  isFinite: Number.isFinite,
  isNaN: Number.isNaN,
  parseInt: (s: string, radix?: number) => parseInt(s, radix),
  parseFloat: (s: string) => parseFloat(s),
};

const SAFE_OBJECT = {
  keys: (o: unknown) => (o && typeof o === "object" ? Object.keys(o) : []),
  values: (o: unknown) => (o && typeof o === "object" ? Object.values(o) : []),
  entries: (o: unknown) => (o && typeof o === "object" ? Object.entries(o) : []),
};

// ---------------------------------------------------------------------------
// Safe property access
// ---------------------------------------------------------------------------

function getProperty(obj: unknown, prop: string): unknown {
  if (obj == null) return undefined;

  // Array built-in properties
  if (Array.isArray(obj)) {
    if (prop === "length") return obj.length;
    const idx = parseInt(prop, 10);
    if (!isNaN(idx)) return obj[idx];
  }

  // String built-in properties
  if (typeof obj === "string") {
    if (prop === "length") return obj.length;
  }

  // Object property access
  if (typeof obj === "object") {
    return (obj as Record<string, unknown>)[prop];
  }

  return undefined;
}

// ---------------------------------------------------------------------------
// Safe method calls on values
// ---------------------------------------------------------------------------

function applyMethod(obj: unknown, method: string, args: unknown[], ctx: Context): unknown {
  // --- Array methods ---
  if (Array.isArray(obj)) {
    switch (method) {
      case "length": return obj.length;
      case "includes": return obj.includes(args[0]);
      case "indexOf": return obj.indexOf(args[0]);
      case "join": return obj.join(args[0] != null ? String(args[0]) : ",");
      case "slice": return obj.slice(args[0] as number, args[1] as number | undefined);
      case "concat": return obj.concat(...(args as unknown[][]));
      case "reverse": return [...obj].reverse();
      case "flat": return obj.flat(args[0] as number | undefined);
      case "at": return obj.at(args[0] as number);

      // filter(key) — filter where item[key] or item is truthy
      // filter(key, value) — filter where item[key] === value
      case "filter": {
        const key = args[0] != null ? String(args[0]) : null;
        const filterValue = args[1];
        if (key === null) return obj.filter(Boolean);
        if (args.length >= 2) {
          return obj.filter((item: any) =>
            item != null && typeof item === "object" ? item[key] === filterValue : item === filterValue
          );
        }
        return obj.filter((item: any) =>
          item != null && typeof item === "object" ? !!item[key] : !!item
        );
      }

      // map(key) — extract a property from each item
      case "map": {
        const key = args[0] != null ? String(args[0]) : null;
        if (key === null) return obj;
        return obj.map((item: any) =>
          item != null && typeof item === "object" ? item[key] : item
        );
      }

      // find(key, value) — find first item where item[key] === value
      case "find": {
        const key = String(args[0] ?? "");
        const findValue = args[1];
        return obj.find((item: any) =>
          item != null && typeof item === "object" ? item[key] === findValue : item === findValue
        );
      }

      // sort(key) — sort by property (ascending)
      // sort(key, "desc") — sort descending
      case "sort": {
        const key = args[0] != null ? String(args[0]) : null;
        const dir = args[1] === "desc" ? -1 : 1;
        const sorted = [...obj];
        if (key) {
          sorted.sort((a: any, b: any) => {
            const va = a?.[key] ?? 0;
            const vb = b?.[key] ?? 0;
            return va < vb ? -dir : va > vb ? dir : 0;
          });
        } else {
          sorted.sort((a, b) => (a as number) < (b as number) ? -dir : (a as number) > (b as number) ? dir : 0);
        }
        return sorted;
      }

      // reduce — sum by key or sum numbers
      case "reduce": {
        const key = args[0] != null ? String(args[0]) : null;
        const initial = args[1] ?? 0;
        if (key) {
          return obj.reduce((acc: number, item: any) =>
            acc + (Number(item?.[key]) || 0), Number(initial));
        }
        return obj.reduce((acc: number, item: any) => acc + (Number(item) || 0), Number(initial));
      }

      // some(key) / every(key) — check truthiness of a property
      case "some": {
        const key = String(args[0] ?? "");
        return obj.some((item: any) => item != null && typeof item === "object" ? !!item[key] : !!item);
      }
      case "every": {
        const key = String(args[0] ?? "");
        return obj.every((item: any) => item != null && typeof item === "object" ? !!item[key] : !!item);
      }

      // count(key, value) — count items matching condition
      case "count": {
        const key = args[0] != null ? String(args[0]) : null;
        const countValue = args[1];
        if (key === null) return obj.length;
        if (args.length >= 2) {
          return obj.filter((item: any) =>
            item != null && typeof item === "object" ? item[key] === countValue : item === countValue
          ).length;
        }
        return obj.filter((item: any) =>
          item != null && typeof item === "object" ? !!item[key] : !!item
        ).length;
      }
    }
  }

  // --- String methods ---
  if (typeof obj === "string") {
    switch (method) {
      case "length": return obj.length;
      case "toUpperCase": return obj.toUpperCase();
      case "toLowerCase": return obj.toLowerCase();
      case "trim": return obj.trim();
      case "trimStart": return obj.trimStart();
      case "trimEnd": return obj.trimEnd();
      case "includes": return obj.includes(String(args[0] ?? ""));
      case "startsWith": return obj.startsWith(String(args[0] ?? ""));
      case "endsWith": return obj.endsWith(String(args[0] ?? ""));
      case "indexOf": return obj.indexOf(String(args[0] ?? ""));
      case "slice": return obj.slice(args[0] as number, args[1] as number | undefined);
      case "substring": return obj.substring(args[0] as number, args[1] as number | undefined);
      case "replace": return obj.replace(String(args[0] ?? ""), String(args[1] ?? ""));
      case "replaceAll": return obj.split(String(args[0] ?? "")).join(String(args[1] ?? ""));
      case "split": return obj.split(String(args[0] ?? ""));
      case "charAt": return obj.charAt(args[0] as number ?? 0);
      case "padStart": return obj.padStart(args[0] as number, String(args[1] ?? " "));
      case "padEnd": return obj.padEnd(args[0] as number, String(args[1] ?? " "));
      case "repeat": return obj.repeat(Math.min(args[0] as number ?? 0, 1000)); // safety cap
      case "at": return obj.at(args[0] as number);
    }
  }

  // --- Number methods ---
  if (typeof obj === "number") {
    switch (method) {
      case "toFixed": return obj.toFixed(args[0] as number ?? 0);
      case "toString": return obj.toString(args[0] as number | undefined);
      case "toPrecision": return obj.toPrecision(args[0] as number);
    }
  }

  // --- Generic object method (safe subset) ---
  if (obj != null && typeof obj === "object" && !Array.isArray(obj)) {
    const record = obj as Record<string, unknown>;
    if (method === "hasOwnProperty" || method === "has") {
      return args[0] != null ? String(args[0]) in record : false;
    }
  }

  return undefined;
}

// ---------------------------------------------------------------------------
// Pipe functions — transform a value through a named function
// ---------------------------------------------------------------------------

function applyPipe(value: unknown, pipeName: string, args: unknown[]): unknown {
  switch (pipeName) {
    // Formatting
    case "toFixed": return Number(value).toFixed(args[0] as number ?? 2);
    case "round": return Math.round(Number(value));
    case "ceil": return Math.ceil(Number(value));
    case "floor": return Math.floor(Number(value));
    case "abs": return Math.abs(Number(value));

    // String transforms
    case "uppercase": return String(value ?? "").toUpperCase();
    case "lowercase": return String(value ?? "").toLowerCase();
    case "trim": return String(value ?? "").trim();
    case "capitalize": {
      const s = String(value ?? "");
      return s.charAt(0).toUpperCase() + s.slice(1);
    }
    case "truncate": {
      const s = String(value ?? "");
      const len = (args[0] as number) ?? 50;
      const suffix = (args[1] as string) ?? "...";
      return s.length > len ? s.slice(0, len) + suffix : s;
    }

    // Type conversion
    case "number": return Number(value);
    case "string": return String(value ?? "");
    case "boolean": return Boolean(value);
    case "json": return JSON.stringify(value);
    case "parse": { try { return JSON.parse(String(value)); } catch { return null; } }

    // Date formatting
    case "date": {
      try {
        const d = new Date(value as string | number);
        if (isNaN(d.getTime())) return String(value);
        const fmt = (args[0] as string) ?? "short";
        if (fmt === "iso") return d.toISOString();
        if (fmt === "time") return d.toLocaleTimeString();
        if (fmt === "long") return d.toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });
        return d.toLocaleDateString();
      } catch { return String(value); }
    }
    case "timeAgo": {
      try {
        const d = new Date(value as string | number);
        const diff = Date.now() - d.getTime();
        const secs = Math.floor(diff / 1000);
        if (secs < 60) return `${secs}s ago`;
        const mins = Math.floor(secs / 60);
        if (mins < 60) return `${mins}m ago`;
        const hrs = Math.floor(mins / 60);
        if (hrs < 24) return `${hrs}h ago`;
        const days = Math.floor(hrs / 24);
        return `${days}d ago`;
      } catch { return String(value); }
    }

    // Array pipes
    case "first": return Array.isArray(value) ? value[0] : value;
    case "last": return Array.isArray(value) ? value[value.length - 1] : value;
    case "reverse": return Array.isArray(value) ? [...value].reverse() : value;
    case "unique": return Array.isArray(value) ? [...new Set(value)] : value;
    case "flatten": return Array.isArray(value) ? value.flat(args[0] as number ?? 1) : value;
    case "count": return Array.isArray(value) ? value.length : typeof value === "string" ? value.length : 0;
    case "sum": {
      if (!Array.isArray(value)) return 0;
      const key = args[0] != null ? String(args[0]) : null;
      if (key) return value.reduce((s: number, item: any) => s + (Number(item?.[key]) || 0), 0);
      return value.reduce((s: number, v: any) => s + (Number(v) || 0), 0);
    }
    case "avg": {
      if (!Array.isArray(value) || value.length === 0) return 0;
      const key = args[0] != null ? String(args[0]) : null;
      const total = key
        ? value.reduce((s: number, item: any) => s + (Number(item?.[key]) || 0), 0)
        : value.reduce((s: number, v: any) => s + (Number(v) || 0), 0);
      return total / value.length;
    }
    case "min": {
      if (!Array.isArray(value) || value.length === 0) return 0;
      const key = args[0] != null ? String(args[0]) : null;
      const nums = key ? value.map((item: any) => Number(item?.[key]) || 0) : value.map(Number);
      return Math.min(...nums);
    }
    case "max": {
      if (!Array.isArray(value) || value.length === 0) return 0;
      const key = args[0] != null ? String(args[0]) : null;
      const nums = key ? value.map((item: any) => Number(item?.[key]) || 0) : value.map(Number);
      return Math.max(...nums);
    }

    // Default — return unchanged
    default: return value;
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Evaluate a single expression string against a context.
 * Returns the computed value.
 *
 * @example
 *   evaluate("items.filter(done).length", { items: [{done: true}, {done: false}] })
 *   // => 1
 */
export function evaluate(expression: string, context: Context = {}): unknown {
  try {
    const tokens = tokenize(expression.trim());
    const parser = new ExpressionParser(tokens, context);
    return parser.parse();
  } catch {
    // On any parse error, return the raw expression as string
    return expression;
  }
}

/**
 * Resolve all {{expressions}} in a template string.
 * Mixed content is concatenated as a string.
 * If the entire string is a single {{expression}}, the raw value is returned (preserving type).
 *
 * @example
 *   resolveTemplate("Hello {{name}}!", { name: "World" })
 *   // => "Hello World!"
 *
 *   resolveTemplate("{{count}}", { count: 42 })
 *   // => 42  (number, not string)
 *
 *   resolveTemplate("{{items.filter(done).length}} done", { items: [...] })
 *   // => "3 done"
 */
export function resolveTemplate(template: string, context: Context = {}): unknown {
  if (typeof template !== "string") return template;

  // Fast path: no expressions
  if (!template.includes("{{")) return template;

  // Single expression: return typed value
  const singleMatch = template.match(/^\{\{(.+?)\}\}$/s);
  if (singleMatch) {
    return evaluate(singleMatch[1], context);
  }

  // Mixed content: interpolate as string
  return template.replace(/\{\{(.+?)\}\}/gs, (_, expr) => {
    const result = evaluate(expr, context);
    if (result == null) return "";
    return String(result);
  });
}

/**
 * Deep-resolve all string values in an object/array tree.
 * Useful for resolving an entire action or component props object.
 */
export function resolveDeep(value: unknown, context: Context): unknown {
  if (typeof value === "string") return resolveTemplate(value, context);
  if (Array.isArray(value)) return value.map((v) => resolveDeep(v, context));
  if (value != null && typeof value === "object") {
    const result: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) {
      result[k] = resolveDeep(v, context);
    }
    return result;
  }
  return value;
}

/**
 * Get a value from a nested object by dot-separated path.
 * Supports bracket notation: "items[0].name"
 */
export function getByPath(obj: unknown, path: string): unknown {
  if (!path || obj == null) return obj;

  const segments = path
    .replace(/\[(\d+)\]/g, ".$1")
    .split(".")
    .filter(Boolean);

  let current: unknown = obj;
  for (const seg of segments) {
    if (current == null) return undefined;
    if (typeof current === "object") {
      current = (current as Record<string, unknown>)[seg];
    } else {
      return undefined;
    }
  }
  return current;
}
