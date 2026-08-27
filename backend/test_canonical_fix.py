"""
Regression + bug verification test for the canonical-matching fix.

Tests:
  REGRESSION (must still map correctly):
    WBC, Neutrophils, Lymphocytes, Haemoglobin(HB), Platelet Count

  BUG FIXES (must now map correctly):
    PCT  -> Plateletcrit (was: Prothrombin Time)  [Bug 1]
    PDW-CV -> Platelet Distribution Width-CV (was: Red Cell Distribution Width)  [Bug 2]

  NEW ENTRIES (must now map, were unmapped before):
    Total Red Blood Cells, Haematocrit (P.C.V.), Mean Corpuscular Hb.(MCH),
    Mean Corp.Hb.Con. (MCHC), RDW-SD, MPV, PDW, P-LCR, P-LCC
"""

import sys
sys.path.insert(0, ".")

from app.pipeline.normalizer import normalize_test_name, reload_lookup

reload_lookup()

REGRESSION_TESTS = [
    ("WBC",               "White Blood Cell Count", "6690-2"),
    ("Neutrophils",       "Neutrophils",            "770-8"),
    ("Lymphocytes",       "Lymphocytes",            "736-9"),
    ("Haemoglobin(HB)",   "Hemoglobin",             "718-7"),
    ("Platelet Count",    "Platelet Count",          "777-3"),
]

BUG_FIX_TESTS = [
    # (raw_name, expected_canonical, expected_loinc, description)
    ("PCT",    "Plateletcrit",                 "51637-7", "Bug 1: was Prothrombin Time"),
    ("PDW-CV", "Platelet Distribution Width-CV", "32207-3", "Bug 2: was Red Cell Distribution Width"),
]

NEW_ENTRY_TESTS = [
    ("Total Red Blood Cells",    "Red Blood Cell Count",                    "789-8"),
    ("Haematocrit (P.C.V.)",     "Hematocrit",                              "4544-3"),
    ("Mean Corpuscular Hb.(MCH)", "Mean Corpuscular Hemoglobin",            "785-6"),
    ("Mean Corp.Hb.Con. (MCHC)", "Mean Corpuscular Hemoglobin Concentration", "786-4"),
    ("RDW-SD",   "Red Cell Distribution Width-SD",   "21000-5"),
    ("MPV",      "Mean Platelet Volume",              "32623-1"),
    ("PDW",      "Platelet Distribution Width",       "32207-3"),
    ("P-LCR",    "Platelet Large Cell Ratio",         None),
    ("P-LCC",    "Platelet Large Cell Count",         None),
]

def run_tests(label, tests, include_desc=False):
    print(f"\n{'='*70}")
    print(f"  {label}")
    print(f"{'='*70}")
    header = f"  {'Raw Name':<35} {'Got Canonical':<42} {'Got LOINC':<12} {'Status'}"
    print(header)
    print(f"  {'-'*33} {'-'*40} {'-'*10} {'-'*6}")
    passed = 0
    failed = 0
    for row in tests:
        raw = row[0]
        exp_canon = row[1]
        exp_loinc = row[2]
        desc = row[3] if include_desc and len(row) > 3 else ""
        r = normalize_test_name(raw)
        got_canon = r["canonical_name"] or "[no match]"
        got_loinc = r["loinc_code"] or "-"
        canon_ok = (r["canonical_name"] == exp_canon)
        loinc_ok = (r["loinc_code"] == exp_loinc)
        ok = canon_ok and loinc_ok
        status = "PASS" if ok else "FAIL"
        if ok:
            passed += 1
        else:
            failed += 1
        suffix = f"  <- {desc}" if desc else ""
        score = f" (score={r['match_score']})" if r['match_score'] else ""
        print(f"  {raw:<35} {got_canon:<42} {got_loinc:<12} {status}{score}{suffix}")
        if not ok:
            if not canon_ok:
                print(f"    {'':>35} expected canonical: {exp_canon}")
            if not loinc_ok:
                print(f"    {'':>35} expected loinc:    {exp_loinc}")
    print(f"\n  Result: {passed} passed, {failed} failed")
    return failed

total_failures = 0
total_failures += run_tests("REGRESSION TESTS (must not break)", REGRESSION_TESTS)
total_failures += run_tests("BUG FIX TESTS (must now be correct)", BUG_FIX_TESTS, include_desc=True)
total_failures += run_tests("NEW ENTRY TESTS (previously unmapped)", NEW_ENTRY_TESTS)

print(f"\n{'='*70}")
if total_failures == 0:
    print("  ALL TESTS PASSED")
else:
    print(f"  TOTAL FAILURES: {total_failures}")
print(f"{'='*70}\n")
sys.exit(0 if total_failures == 0 else 1)
