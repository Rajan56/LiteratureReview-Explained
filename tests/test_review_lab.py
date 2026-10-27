"""Checks the Python engine against published reference values.

Reference: metafor (Viechtbauer, 2010) results for the BCG vaccine data (dat.bcg),
log risk ratios: FE -0.4303 (SE 0.0405); DL -0.7141, tau^2 0.3088;
REML -0.7145 (SE 0.1798), tau^2 0.3132, I^2 92.22%, Q(12) 152.2330.
Run with:  python -m pytest tests   (or simply: python tests/test_review_lab.py)
"""
import math
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "py"))
import review_lab as rl  # noqa: E402


def close(a, b, tol=5e-4):
    return abs(a - b) < tol


def test_bcg_fixed_effect():
    y, v, _ = rl.bcg_effects()
    r = rl.meta_analysis(y, v, method="FE")
    assert close(r["estimate"], -0.4303) and close(r["se"], 0.0405)
    assert close(r["Q"], 152.2330, 1e-3)


def test_bcg_dersimonian_laird():
    y, v, _ = rl.bcg_effects()
    r = rl.meta_analysis(y, v, method="DL")
    assert close(r["estimate"], -0.7141) and close(r["tau2"], 0.3088)


def test_bcg_reml():
    y, v, _ = rl.bcg_effects()
    r = rl.meta_analysis(y, v, method="REML")
    assert close(r["estimate"], -0.7145) and close(r["se"], 0.1798)
    assert close(r["tau2"], 0.3132) and close(r["I2"], 92.22, 0.01)


def test_distributions():
    assert close(rl.norm_ppf(0.975), 1.959964, 1e-6)
    assert close(rl.t_ppf(0.975, 10), 2.228139, 1e-5)
    assert close(rl.chi2_sf(3.841459, 1), 0.05, 1e-6)


def test_effect_sizes():
    g, v = rl.es_hedges_g(10, 2, 30, 9, 2, 30)
    assert close(g, 0.4935, 1e-3)
    z, vz = rl.es_fisher_z(0.3, 103)
    assert close(z, 0.3095, 1e-3) and close(vz, 0.01, 1e-9)


def test_kappa():
    k = rl.cohen_kappa([1, 1, 0, 0, 1, 0, 1, 0], [1, 0, 0, 0, 1, 0, 1, 1])
    assert close(k["kappa"], 0.5, 1e-9)


def test_publication_bias_simulation_inflates_estimate():
    s = rl.simulate_studies(k=40, mu=0.1, tau=0.05, bias=0.9, seed=3)
    y = [x["yi"] for x in s["published"]]
    v = [x["vi"] for x in s["published"]]
    assert rl.meta_analysis(y, v)["estimate"] > 0.1


if __name__ == "__main__":
    for name, fn in list(globals().items()):
        if name.startswith("test_"):
            fn()
            print("ok", name)
