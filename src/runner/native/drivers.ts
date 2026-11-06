/**
 * Generates the test driver for each native language from a problem's
 * signature. The driver reads every test from a file, calls the learner's
 * function once per test, and prints one protocol line per test:
 *
 *   S <i>                                         test i is about to run (starts the watchdog)
 *   R <i> <nanos> <stdoutHex> <encoded result>    returned normally
 *   E <i> <nanos> <stdoutHex> <nameHex> <msgHex> <stackHex>   threw / panicked
 *
 * The learner's stdout is captured per test so it never mixes with protocol lines.
 */
import type { ValueType } from "@/problems/languages";
import { GO_TYPE, JAVA_TYPE, cReturnType } from "@/problems/starters";

export interface DriverSig {
  /** Function name as the learner must define it in THIS language. */
  fn: string;
  params: { name: string; type: ValueType }[];
  returns: ValueType;
}

const cap = (t: ValueType) => ({ int: "Int", long: "Long", bool: "Bool", string: "Str", "int[]": "IntArr", "int[][]": "IntArr2", "string[]": "StrArr" })[t];

// =========================================================================
// Java
// =========================================================================
export function javaDriver(sig: DriverSig): string {
  const decls = sig.params.map((p, i) => `${JAVA_TYPE[p.type]} p${i} = rd${cap(p.type)}();`).join("\n      ");
  const call = `Solution.${sig.fn}(${sig.params.map((_, i) => `p${i}`).join(", ")})`;
  const nullCheck = ["string", "int[]", "int[][]", "string[]"].includes(sig.returns)
    ? `if (r == null) throw new IllegalStateException("Your method returned null");`
    : "";
  return String.raw`import java.io.*;
import java.nio.charset.StandardCharsets;
import java.nio.file.*;

public class Main {
  static byte[] data;
  static int pos = 0;

  static void skip() { while (pos < data.length && data[pos] <= ' ') pos++; }
  static long rdLong() {
    skip();
    boolean neg = false;
    if (data[pos] == '-') { neg = true; pos++; }
    long v = 0;
    while (pos < data.length && data[pos] >= '0' && data[pos] <= '9') { v = v * 10 + (data[pos] - '0'); pos++; }
    return neg ? -v : v;
  }
  static int rdInt() { return (int) rdLong(); }
  static boolean rdBool() { return rdLong() != 0; }
  static String rdStr() {
    skip();
    int s = pos;
    while (pos < data.length && data[pos] > ' ') pos++;
    int n = pos - s;
    if (n == 1 && data[s] == '-') return "";
    byte[] b = new byte[n / 2];
    for (int i = 0; i < b.length; i++) b[i] = (byte) ((Character.digit(data[s + 2 * i], 16) << 4) | Character.digit(data[s + 2 * i + 1], 16));
    return new String(b, StandardCharsets.UTF_8);
  }
  static int[] rdIntArr() { int n = rdInt(); int[] a = new int[n]; for (int i = 0; i < n; i++) a[i] = rdInt(); return a; }
  static int[][] rdIntArr2() { int n = rdInt(); int[][] a = new int[n][]; for (int i = 0; i < n; i++) a[i] = rdIntArr(); return a; }
  static String[] rdStrArr() { int n = rdInt(); String[] a = new String[n]; for (int i = 0; i < n; i++) a[i] = rdStr(); return a; }

  static String hexBytes(byte[] b) {
    if (b.length == 0) return "-";
    int n = Math.min(b.length, 20000);
    StringBuilder sb = new StringBuilder(n * 2);
    for (int i = 0; i < n; i++) { sb.append(Character.forDigit((b[i] >> 4) & 15, 16)); sb.append(Character.forDigit(b[i] & 15, 16)); }
    return sb.toString();
  }
  static String hexStr(String s) { return hexBytes(s.getBytes(StandardCharsets.UTF_8)); }

  static void encInt(StringBuilder sb, long v) { sb.append(v); }
  static void encLong(StringBuilder sb, long v) { sb.append(v); }
  static void encBool(StringBuilder sb, boolean v) { sb.append(v ? '1' : '0'); }
  static void encStr(StringBuilder sb, String v) { sb.append(v.isEmpty() ? "-" : hexStr(v)); }
  static void encIntArr(StringBuilder sb, int[] a) { sb.append(a.length); for (int x : a) { sb.append(' ').append(x); } }
  static void encIntArr2(StringBuilder sb, int[][] a) { sb.append(a.length); for (int[] r : a) { sb.append(' '); encIntArr(sb, r); } }
  static void encStrArr(StringBuilder sb, String[] a) { sb.append(a.length); for (String s : a) { sb.append(' '); encStr(sb, s); } }

  static void run(PrintStream real) throws Exception {
    int n = rdInt();
    for (int i = 0; i < n; i++) {
      ${decls}
      real.println("S " + i);
      real.flush();
      ByteArrayOutputStream buf = new ByteArrayOutputStream();
      PrintStream cap = new PrintStream(buf, true, "UTF-8");
      System.setOut(cap);
      long t0 = System.nanoTime();
      try {
        ${JAVA_TYPE[sig.returns]} r = ${call};
        long dt = System.nanoTime() - t0;
        System.setOut(real);
        cap.flush();
        ${nullCheck}
        StringBuilder sb = new StringBuilder();
        enc${cap(sig.returns)}(sb, r);
        real.println("R " + i + " " + dt + " " + hexBytes(buf.toByteArray()) + " " + sb);
      } catch (Throwable e) {
        long dt = System.nanoTime() - t0;
        System.setOut(real);
        cap.flush();
        StringWriter sw = new StringWriter();
        e.printStackTrace(new PrintWriter(sw));
        real.println("E " + i + " " + dt + " " + hexBytes(buf.toByteArray()) + " " + hexStr(e.getClass().getSimpleName()) + " " + hexStr(String.valueOf(e.getMessage())) + " " + hexStr(sw.toString()));
      }
      real.flush();
    }
  }

  public static void main(String[] args) throws Exception {
    data = Files.readAllBytes(Paths.get(args[0]));
    final PrintStream real = System.out;
    // Run on a thread with a large stack so deep (but legitimate) recursion does not overflow.
    Thread t = new Thread(null, () -> {
      try { run(real); } catch (Throwable e) { real.println("F " + hexStr(String.valueOf(e))); real.flush(); }
    }, "runner", 512L * 1024 * 1024);
    t.start();
    t.join();
  }
}
`;
}

// =========================================================================
// C
// =========================================================================
export function cDriver(sig: DriverSig): string {
  const decls: string[] = [];
  const args: string[] = [];
  sig.params.forEach((p, i) => {
    const n = `p${i}`;
    switch (p.type) {
      case "int":
        decls.push(`int ${n} = (int)vc_ll();`);
        args.push(n);
        break;
      case "long":
        decls.push(`long long ${n} = vc_ll();`);
        args.push(n);
        break;
      case "bool":
        decls.push(`bool ${n} = vc_ll() != 0;`);
        args.push(n);
        break;
      case "string":
        decls.push(`char *${n} = vc_str();`);
        args.push(n);
        break;
      case "int[]":
        decls.push(`int ${n}Len = 0; int *${n} = vc_ints(&${n}Len);`);
        args.push(`(const int *)${n}`, `${n}Len`);
        break;
      case "int[][]":
        decls.push(`int ${n}Len = 0; int *${n}Cols = NULL; int **${n} = vc_ints2(&${n}Len, &${n}Cols);`);
        args.push(n, `${n}Len`, `(const int *)${n}Cols`);
        break;
      case "string[]":
        decls.push(`int ${n}Len = 0; char **${n} = vc_strs(&${n}Len);`);
        args.push(`(const char **)${n}`, `${n}Len`);
        break;
    }
  });
  let callPrep = "";
  let enc = "";
  if (sig.returns === "int[]") {
    callPrep = "int rs = 0;";
    args.push("&rs");
    enc = "vc_enc_ints(&sb, r, rs);";
  } else if (sig.returns === "int[][]") {
    callPrep = "int rs = 0; int *rcols = NULL;";
    args.push("&rs", "&rcols");
    enc = "vc_enc_ints2(&sb, r, rs, rcols);";
  } else if (sig.returns === "int" || sig.returns === "long") enc = "vc_sb_ll(&sb, (long long)r);";
  else if (sig.returns === "bool") enc = "vc_sb_ll(&sb, r ? 1 : 0);";
  else if (sig.returns === "string") enc = "vc_enc_str(&sb, r);";
  else enc = "vc_enc_strs(&sb, r, 0);"; // string[] returns are not supported by the C convention

  return String.raw`#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <stdbool.h>
#include <stdint.h>
#include <unistd.h>
#include <time.h>

/* The learner's file may define its own main() for local testing: rename it so ours wins. */
#define main vc_user_main
#include "solution.c"
#undef main

static char *vc_data;
static size_t vc_len, vc_pos;

static void vc_skip(void) { while (vc_pos < vc_len && (unsigned char)vc_data[vc_pos] <= ' ') vc_pos++; }
static long long vc_ll(void) {
  vc_skip();
  int neg = 0;
  if (vc_data[vc_pos] == '-') { neg = 1; vc_pos++; }
  long long v = 0;
  while (vc_pos < vc_len && vc_data[vc_pos] >= '0' && vc_data[vc_pos] <= '9') { v = v * 10 + (vc_data[vc_pos] - '0'); vc_pos++; }
  return neg ? -v : v;
}
static int vc_hexv(char c) { return c <= '9' ? c - '0' : (c | 32) - 'a' + 10; }
static char *vc_str(void) {
  vc_skip();
  size_t s = vc_pos;
  while (vc_pos < vc_len && (unsigned char)vc_data[vc_pos] > ' ') vc_pos++;
  size_t n = vc_pos - s;
  if (n == 1 && vc_data[s] == '-') { char *e = malloc(1); e[0] = 0; return e; }
  char *o = malloc(n / 2 + 1);
  for (size_t i = 0; i < n / 2; i++) o[i] = (char)((vc_hexv(vc_data[s + 2 * i]) << 4) | vc_hexv(vc_data[s + 2 * i + 1]));
  o[n / 2] = 0;
  return o;
}
static int *vc_ints(int *len) {
  int n = (int)vc_ll();
  int *a = malloc(sizeof(int) * (n > 0 ? n : 1));
  for (int i = 0; i < n; i++) a[i] = (int)vc_ll();
  *len = n;
  return a;
}
static int **vc_ints2(int *rows, int **cols) {
  int n = (int)vc_ll();
  int **a = malloc(sizeof(int *) * (n > 0 ? n : 1));
  int *c = malloc(sizeof(int) * (n > 0 ? n : 1));
  for (int i = 0; i < n; i++) a[i] = vc_ints(&c[i]);
  *rows = n;
  *cols = c;
  return a;
}
static char **vc_strs(int *len) {
  int n = (int)vc_ll();
  char **a = malloc(sizeof(char *) * (n > 0 ? n : 1));
  for (int i = 0; i < n; i++) a[i] = vc_str();
  *len = n;
  return a;
}

typedef struct { char *p; size_t n, cap; } vc_sb;
static void vc_sb_put(vc_sb *s, const char *t, size_t k) {
  if (s->n + k + 1 > s->cap) { s->cap = (s->n + k + 1) * 2; s->p = realloc(s->p, s->cap); }
  memcpy(s->p + s->n, t, k);
  s->n += k;
  s->p[s->n] = 0;
}
static void vc_sb_ll(vc_sb *s, long long v) { char t[32]; int k = snprintf(t, sizeof t, "%lld", v); vc_sb_put(s, t, (size_t)k); }
static void vc_enc_ints(vc_sb *s, const int *a, int n) {
  vc_sb_ll(s, n);
  for (int i = 0; i < n; i++) { vc_sb_put(s, " ", 1); vc_sb_ll(s, a[i]); }
}
static void vc_enc_ints2(vc_sb *s, int **a, int n, const int *cols) {
  vc_sb_ll(s, n);
  for (int i = 0; i < n; i++) { vc_sb_put(s, " ", 1); vc_enc_ints(s, a[i], cols[i]); }
}
static void vc_hex_into(vc_sb *s, const unsigned char *b, size_t n) {
  static const char H[] = "0123456789abcdef";
  if (n == 0) { vc_sb_put(s, "-", 1); return; }
  for (size_t i = 0; i < n; i++) { char t[2] = { H[b[i] >> 4], H[b[i] & 15] }; vc_sb_put(s, t, 2); }
}
static void vc_enc_str(vc_sb *s, const char *str) { vc_hex_into(s, (const unsigned char *)str, strlen(str)); }
static void vc_enc_strs(vc_sb *s, char **a, int n) {
  vc_sb_ll(s, n);
  for (int i = 0; i < n; i++) { vc_sb_put(s, " ", 1); vc_enc_str(s, a[i]); }
}

int main(int argc, char **argv) {
  (void)argc;
  FILE *f = fopen(argv[1], "rb");
  fseek(f, 0, SEEK_END);
  vc_len = (size_t)ftell(f);
  fseek(f, 0, SEEK_SET);
  vc_data = malloc(vc_len + 1);
  if (fread(vc_data, 1, vc_len, f) != vc_len) return 2;
  vc_data[vc_len] = 0;
  fclose(f);

  int n = (int)vc_ll();
  for (int i = 0; i < n; i++) {
    ${decls.join("\n    ")}
    ${callPrep}
    printf("S %d\n", i);
    fflush(stdout);
    int saved = dup(1);
    FILE *capf = tmpfile();
    dup2(fileno(capf), 1);
    struct timespec t0, t1;
    clock_gettime(CLOCK_MONOTONIC, &t0);
    ${cReturnType(sig.returns)} r = ${sig.fn}(${args.join(", ")});
    clock_gettime(CLOCK_MONOTONIC, &t1);
    fflush(stdout);
    dup2(saved, 1);
    close(saved);
    long long nanos = (long long)(t1.tv_sec - t0.tv_sec) * 1000000000LL + (t1.tv_nsec - t0.tv_nsec);
    long sz = 0;
    fseek(capf, 0, SEEK_END);
    sz = ftell(capf);
    fseek(capf, 0, SEEK_SET);
    if (sz > 20000) sz = 20000;
    unsigned char *ob = malloc((size_t)sz + 1);
    size_t got = fread(ob, 1, (size_t)sz, capf);
    fclose(capf);
    vc_sb out = {0}, sb = {0};
    vc_hex_into(&out, ob, got);
    ${enc}
    printf("R %d %lld %s %s\n", i, nanos, out.p ? out.p : "-", sb.p ? sb.p : "");
    fflush(stdout);
    free(ob);
    free(out.p);
    free(sb.p);
  }
  return 0;
}
`;
}

// =========================================================================
// Go
// =========================================================================
export function goDriver(sig: DriverSig): string {
  const decls = sig.params
    .map((p, i) => {
      const reader = { int: "int(vcInt())", long: "vcInt()", bool: "vcInt() != 0", string: "vcStr()", "int[]": "vcInts()", "int[][]": "vcInts2()", "string[]": "vcStrs()" }[p.type];
      return `p${i} := ${reader}`;
    })
    .join("\n\t\t");
  const call = `${sig.fn}(${sig.params.map((_, i) => `p${i}`).join(", ")})`;
  const enc = {
    int: "vcEncInt(&sb, int64(res))",
    long: "vcEncInt(&sb, int64(res))",
    bool: "if res { sb.WriteString(\"1\") } else { sb.WriteString(\"0\") }",
    string: "vcEncStr(&sb, res)",
    "int[]": "vcEncInts(&sb, res)",
    "int[][]": "vcEncInts2(&sb, res)",
    "string[]": "vcEncStrs(&sb, res)",
  }[sig.returns];
  return String.raw`package main

import (
	"encoding/hex"
	"fmt"
	"os"
	"runtime/debug"
	"strconv"
	"strings"
	"time"
)

var vcData []byte
var vcPos int

func vcTok() string {
	for vcPos < len(vcData) && vcData[vcPos] <= ' ' {
		vcPos++
	}
	s := vcPos
	for vcPos < len(vcData) && vcData[vcPos] > ' ' {
		vcPos++
	}
	return string(vcData[s:vcPos])
}
func vcInt() int64 {
	v, _ := strconv.ParseInt(vcTok(), 10, 64)
	return v
}
func vcStr() string {
	t := vcTok()
	if t == "-" {
		return ""
	}
	b, _ := hex.DecodeString(t)
	return string(b)
}
func vcInts() []int {
	n := int(vcInt())
	a := make([]int, n)
	for i := range a {
		a[i] = int(vcInt())
	}
	return a
}
func vcInts2() [][]int {
	n := int(vcInt())
	a := make([][]int, n)
	for i := range a {
		a[i] = vcInts()
	}
	return a
}
func vcStrs() []string {
	n := int(vcInt())
	a := make([]string, n)
	for i := range a {
		a[i] = vcStr()
	}
	return a
}

func vcHex(b []byte) string {
	if len(b) == 0 {
		return "-"
	}
	if len(b) > 20000 {
		b = b[:20000]
	}
	return hex.EncodeToString(b)
}
func vcEncInt(sb *strings.Builder, v int64) { sb.WriteString(strconv.FormatInt(v, 10)) }
func vcEncStr(sb *strings.Builder, s string) { sb.WriteString(vcHex([]byte(s))) }
func vcEncInts(sb *strings.Builder, a []int) {
	sb.WriteString(strconv.Itoa(len(a)))
	for _, x := range a {
		sb.WriteString(" ")
		sb.WriteString(strconv.Itoa(x))
	}
}
func vcEncInts2(sb *strings.Builder, a [][]int) {
	sb.WriteString(strconv.Itoa(len(a)))
	for _, r := range a {
		sb.WriteString(" ")
		vcEncInts(sb, r)
	}
}
func vcEncStrs(sb *strings.Builder, a []string) {
	sb.WriteString(strconv.Itoa(len(a)))
	for _, s := range a {
		sb.WriteString(" ")
		vcEncStr(sb, s)
	}
}

func main() {
	real := os.Stdout
	var err error
	vcData, err = os.ReadFile(os.Args[1])
	if err != nil {
		fmt.Fprintln(real, "F "+vcHex([]byte(err.Error())))
		return
	}
	n := int(vcInt())
	for i := 0; i < n; i++ {
		${decls}
		real.WriteString(fmt.Sprintf("S %d\n", i))
		tmp, _ := os.CreateTemp("", "vc-out")
		os.Stdout = tmp
		t0 := time.Now()
		var res ${GO_TYPE[sig.returns]}
		var perr interface{}
		var stack string
		func() {
			defer func() {
				if r := recover(); r != nil {
					perr = r
					stack = string(debug.Stack())
				}
			}()
			res = ${call}
		}()
		dt := time.Since(t0).Nanoseconds()
		os.Stdout = real
		out, _ := os.ReadFile(tmp.Name())
		tmp.Close()
		os.Remove(tmp.Name())
		if perr != nil {
			msg := fmt.Sprint(perr)
			real.WriteString(fmt.Sprintf("E %d %d %s %s %s %s\n", i, dt, vcHex(out), vcHex([]byte("panic")), vcHex([]byte(msg)), vcHex([]byte(stack))))
		} else {
			var sb strings.Builder
			${enc}
			real.WriteString(fmt.Sprintf("R %d %d %s %s\n", i, dt, vcHex(out), sb.String()))
		}
	}
}
`;
}
