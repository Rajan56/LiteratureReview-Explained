"""
review_lab.py : the Python engine behind Review Lab.

Pure Python (standard library only), so it runs unchanged in the browser through
Pyodide and on any computer with Python 3.8+.

Contents
  effect sizes ........ log risk ratio, log odds ratio, Hedges' g, Fisher's z
  meta_analysis ....... fixed effect, DerSimonian-Laird, REML; optional Hartung-Knapp
  heterogeneity ....... Q, I^2, H^2, tau^2, prediction interval
  small-study bias .... Egger's regression test, trim-and-fill (L0), fail-safe N
  sensitivity ......... leave-one-out, cumulative meta-analysis
  simulate_studies .... a literature with heterogeneity and publication bias
  cohen_kappa ......... agreement between two screeners
  analyze_synthesis ... sentence-level descriptive / analytical / evaluative profile

Formulas follow Borenstein et al. (2021), Higgins & Thompson (2002),
DerSimonian & Laird (1986), Viechtbauer (2005, 2010), Egger et al. (1997),
Duval & Tweedie (2000), Knapp & Hartung (2003) and Riley et al. (2011).
"""
from __future__ import annotations

import json
import math
import random
import re

__all__ = [
    "es_log_rr", "es_log_or", "es_hedges_g", "es_fisher_z", "z_to_r",
    "meta_analysis", "egger_test", "trim_and_fill", "fail_safe_n",
    "leave_one_out", "cumulative", "simulate_studies", "cohen_kappa",
    "analyze_synthesis", "run_json",
]

# --------------------------------------------------------------------------- distributions

def norm_cdf(x: float) -> float:
    return 0.5 * (1.0 + math.erf(x / math.sqrt(2.0)))


def norm_ppf(p: float) -> float:
    """Inverse standard normal (Acklam's rational approximation, refined by one Newton step)."""
    if not 0.0 < p < 1.0:
        raise ValueError("p must be in (0, 1)")
    a = [-3.969683028665376e01, 2.209460984245205e02, -2.759285104469687e02,
         1.383577518672690e02, -3.066479806614716e01, 2.506628277459239e00]
    b = [-5.447609879822406e01, 1.615858368580409e02, -1.556989798598866e02,
         6.680131188771972e01, -1.328068155288572e01]
    c = [-7.784894002430293e-03, -3.223964580411365e-01, -2.400758277161838e00,
         -2.549732539343734e00, 4.374664141464968e00, 2.938163982698783e00]
    d = [7.784695709041462e-03, 3.224671290700398e-01, 2.445134137142996e00, 3.754408661907416e00]
    lo, hi = 0.02425, 1 - 0.02425
    if p < lo:
        q = math.sqrt(-2 * math.log(p))
        x = (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1)
    elif p <= hi:
        q = p - 0.5
        r = q * q
        x = (((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q / (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1)
    else:
        q = math.sqrt(-2 * math.log(1 - p))
        x = -(((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1)
    e = norm_cdf(x) - p
    u = e * math.sqrt(2 * math.pi) * math.exp(x * x / 2)
    return x - u / (1 + x * u / 2)


def _betacf(a: float, b: float, x: float) -> float:
    """Continued fraction for the regularised incomplete beta function (modified Lentz)."""
    tiny, eps = 1e-300, 3e-16
    qab, qap, qam = a + b, a + 1.0, a - 1.0
    c, d = 1.0, 1.0 - qab * x / qap
    d = 1.0 / (d if abs(d) > tiny else tiny)
    h = d
    for m in range(1, 400):
        m2 = 2 * m
        aa = m * (b - m) * x / ((qam + m2) * (a + m2))
        d = 1.0 + aa * d
        d = 1.0 / (d if abs(d) > tiny else tiny)
        c = 1.0 + aa / c
        c = c if abs(c) > tiny else tiny
        h *= d * c
        aa = -(a + m) * (qab + m) * x / ((a + m2) * (qap + m2))
        d = 1.0 + aa * d
        d = 1.0 / (d if abs(d) > tiny else tiny)
        c = 1.0 + aa / c
        c = c if abs(c) > tiny else tiny
        delta = d * c
        h *= delta
        if abs(delta - 1.0) < eps:
            break
    return h


def betainc(a: float, b: float, x: float) -> float:
    if x <= 0:
        return 0.0
    if x >= 1:
        return 1.0
    lbeta = math.lgamma(a + b) - math.lgamma(a) - math.lgamma(b)
    front = math.exp(lbeta + a * math.log(x) + b * math.log(1 - x))
    if x < (a + 1) / (a + b + 2):
        return front * _betacf(a, b, x) / a
    return 1.0 - front * _betacf(b, a, 1 - x) / b


def t_cdf(t: float, df: float) -> float:
    x = df / (df + t * t)
    tail = 0.5 * betainc(df / 2.0, 0.5, x)
    return 1.0 - tail if t > 0 else tail


def t_ppf(p: float, df: float) -> float:
    lo, hi = -1e3, 1e3
    for _ in range(200):
        mid = (lo + hi) / 2
        if t_cdf(mid, df) < p:
            lo = mid
        else:
            hi = mid
    return (lo + hi) / 2


def _gammainc_lower(s: float, x: float) -> float:
    """Regularised lower incomplete gamma P(s, x)."""
    if x <= 0:
        return 0.0
    if x < s + 1:
        term = total = 1.0 / s
        n = s
        for _ in range(1000):
            n += 1
            term *= x / n
            total += term
            if abs(term) < abs(total) * 1e-15:
                break
        return total * math.exp(-x + s * math.log(x) - math.lgamma(s))
    # continued fraction for the upper part
    tiny = 1e-300
    b = x + 1 - s
    c = 1 / tiny
    d = 1 / b
    h = d
    for i in range(1, 1000):
        an = -i * (i - s)
        b += 2
        d = an * d + b
        d = tiny if abs(d) < tiny else d
        c = b + an / c
        c = tiny if abs(c) < tiny else c
        d = 1 / d
        delta = d * c
        h *= delta
        if abs(delta - 1) < 1e-15:
            break
    return 1.0 - math.exp(-x + s * math.log(x) - math.lgamma(s)) * h


def chi2_sf(x: float, df: float) -> float:
    return 1.0 - _gammainc_lower(df / 2.0, x / 2.0)


# --------------------------------------------------------------------------- effect sizes

def es_log_rr(a, n1, c, n2, cc=0.5):
    """Log risk ratio from events a/n1 (treatment) and c/n2 (control)."""
    if a == 0 or c == 0 or a == n1 or c == n2:
        a, c, n1, n2 = a + cc, c + cc, n1 + 2 * cc, n2 + 2 * cc
    yi = math.log((a / n1) / (c / n2))
    vi = 1 / a - 1 / n1 + 1 / c - 1 / n2
    return yi, vi


def es_log_or(a, b, c, d, cc=0.5):
    """Log odds ratio from a 2x2 table: a, b = events, non-events (treatment); c, d (control)."""
    if 0 in (a, b, c, d):
        a, b, c, d = a + cc, b + cc, c + cc, d + cc
    return math.log((a * d) / (b * c)), 1 / a + 1 / b + 1 / c + 1 / d


def es_hedges_g(m1, sd1, n1, m2, sd2, n2):
    """Bias-corrected standardised mean difference (Hedges, 1981)."""
    df = n1 + n2 - 2
    sp = math.sqrt(((n1 - 1) * sd1 ** 2 + (n2 - 1) * sd2 ** 2) / df)
    d = (m1 - m2) / sp
    j = 1 - 3 / (4 * df - 1)
    g = j * d
    vi = (n1 + n2) / (n1 * n2) + g ** 2 / (2 * (n1 + n2))
    return g, vi


def es_fisher_z(r, n):
    return 0.5 * math.log((1 + r) / (1 - r)), 1 / (n - 3)


def z_to_r(z):
    return math.tanh(z)


# --------------------------------------------------------------------------- core model

def _fe(yi, vi):
    w = [1 / v for v in vi]
    sw = sum(w)
    est = sum(wi * y for wi, y in zip(w, yi)) / sw
    q = sum(wi * (y - est) ** 2 for wi, y in zip(w, yi))
    return est, math.sqrt(1 / sw), q, w


def _tau2_dl(yi, vi):
    k = len(yi)
    _, _, q, w = _fe(yi, vi)
    c = sum(w) - sum(x * x for x in w) / sum(w)
    return max(0.0, (q - (k - 1)) / c) if c > 0 else 0.0


def _tau2_reml(yi, vi, tol=1e-10, maxit=200):
    """REML estimate of tau^2 by Fisher scoring (as in metafor), started at the DL value."""
    t2 = _tau2_dl(yi, vi)
    for _ in range(maxit):
        w = [1 / (v + t2) for v in vi]
        sw = sum(w)
        mu = sum(wi * y for wi, y in zip(w, yi)) / sw
        # P matrix quantities for the univariate random-effects model
        sw2 = sum(x * x for x in w)
        tr_p = sw - sw2 / sw
        # y' P P y
        r = [y - mu for y in yi]
        ypp = sum((wi ** 2) * ri ** 2 for wi, ri in zip(w, r))
        # tr(P P)
        sw3 = sum(x ** 3 for x in w)
        tr_pp = sw2 - 2 * sw3 / sw + (sw2 / sw) ** 2
        step = (ypp - tr_p) / tr_pp
        new = max(0.0, t2 + step)
        if abs(new - t2) < tol:
            t2 = new
            break
        t2 = new
    return t2


def meta_analysis(yi, vi, method="REML", hksj=False, level=0.95, labels=None):
    """Pool effect sizes yi with sampling variances vi.

    method: 'FE' (common/fixed effect), 'DL' (DerSimonian-Laird) or 'REML'.
    hksj:   Hartung-Knapp-Sidik-Jonkman adjustment for the random-effects CI.
    Returns a dict with the pooled estimate, CI, test, heterogeneity statistics,
    prediction interval and per-study weights.
    """
    yi = [float(y) for y in yi]
    vi = [float(v) for v in vi]
    k = len(yi)
    if k < 2:
        raise ValueError("At least two studies are needed")
    if any(v <= 0 for v in vi):
        raise ValueError("Sampling variances must be positive")
    method = method.upper()
    est_fe, se_fe, q, w_fe = _fe(yi, vi)
    df = k - 1
    p_q = chi2_sf(q, df)
    c = sum(w_fe) - sum(x * x for x in w_fe) / sum(w_fe)

    if method == "FE":
        tau2 = 0.0
    elif method == "DL":
        tau2 = _tau2_dl(yi, vi)
    else:
        method = "REML"
        tau2 = _tau2_reml(yi, vi)

    w = [1 / (v + tau2) for v in vi]
    sw = sum(w)
    est = sum(wi * y for wi, y in zip(w, yi)) / sw
    se = math.sqrt(1 / sw)
    alpha = 1 - level
    if hksj and method != "FE":
        qstar = sum(wi * (y - est) ** 2 for wi, y in zip(w, yi)) / df
        se = se * math.sqrt(max(qstar, 1e-12)) if qstar > 0 else se
        crit = t_ppf(1 - alpha / 2, df)
        stat = est / se
        p = 2 * (1 - t_cdf(abs(stat), df))
        dist = f"t({df})"
    else:
        crit = norm_ppf(1 - alpha / 2)
        stat = est / se
        p = 2 * (1 - norm_cdf(abs(stat)))
        dist = "z"

    # I^2 and H^2 as in metafor: based on tau^2 and the "typical" within-study variance
    typical_v = df / c if c > 0 else float("nan")
    if method == "FE":
        i2 = max(0.0, (q - df) / q) * 100 if q > 0 else 0.0
        h2 = q / df if df > 0 else float("nan")
    else:
        i2 = 100 * tau2 / (tau2 + typical_v)
        h2 = (tau2 + typical_v) / typical_v

    pi = None
    if method != "FE" and k >= 3:
        tcrit = t_ppf(1 - alpha / 2, k - 2)
        half = tcrit * math.sqrt(tau2 + se ** 2)
        pi = [est - half, est + half]

    wt = [100 * x / sw for x in w]
    return {
        "method": method + ("+HKSJ" if hksj and method != "FE" else ""),
        "k": k,
        "estimate": est,
        "se": se,
        "ci": [est - crit * se, est + crit * se],
        "stat": stat,
        "dist": dist,
        "p": p,
        "tau2": tau2,
        "tau": math.sqrt(tau2),
        "Q": q,
        "df": df,
        "pQ": p_q,
        "I2": i2,
        "H2": h2,
        "pi": pi,
        "weights": wt,
        "fe_estimate": est_fe,
        "fe_se": se_fe,
        "labels": labels or [f"Study {i + 1}" for i in range(k)],
        "yi": yi,
        "vi": vi,
    }


# --------------------------------------------------------------------------- small-study effects

def egger_test(yi, vi):
    """Egger's regression test: regress yi/se on 1/se; the intercept measures asymmetry."""
    k = len(yi)
    if k < 3:
        return None
    se = [math.sqrt(v) for v in vi]
    x = [1 / s for s in se]
    y = [a / s for a, s in zip(yi, se)]
    mx, my = sum(x) / k, sum(y) / k
    sxx = sum((a - mx) ** 2 for a in x)
    sxy = sum((a - mx) * (b - my) for a, b in zip(x, y))
    slope = sxy / sxx
    intercept = my - slope * mx
    resid = [b - (intercept + slope * a) for a, b in zip(x, y)]
    s2 = sum(r * r for r in resid) / (k - 2)
    se_int = math.sqrt(s2 * (1 / k + mx * mx / sxx))
    t = intercept / se_int
    p = 2 * (1 - t_cdf(abs(t), k - 2))
    return {"intercept": intercept, "se": se_int, "t": t, "df": k - 2, "p": p, "slope": slope}


def trim_and_fill(yi, vi, method="REML", side=None, maxit=50):
    """Duval & Tweedie (2000) trim-and-fill with the L0 estimator.

    side: 'left' or 'right' = the side on which studies are presumed missing.
    If None, it is inferred from Egger's test (positive intercept -> missing on the left).
    """
    k = len(yi)
    if side is None:
        eg = egger_test(yi, vi)
        side = "left" if (eg and eg["intercept"] > 0) else "right"
    # work as if missing studies are on the left: flip signs if they are on the right
    sign = 1 if side == "left" else -1
    y = [sign * a for a in yi]
    order = sorted(range(k), key=lambda i: y[i])
    ys = [y[i] for i in order]
    vs = [vi[i] for i in order]
    k0 = 0
    for _ in range(maxit):
        trimmed_y = ys[: k - k0] if k0 > 0 else ys
        trimmed_v = vs[: k - k0] if k0 > 0 else vs
        center = meta_analysis(trimmed_y, trimmed_v, method=method)["estimate"]
        dev = [a - center for a in ys]
        ranks = _ranks([abs(d) for d in dev])
        tn = sum(r for r, d in zip(ranks, dev) if d > 0)
        l0 = (4 * tn - k * (k + 1)) / (2 * k - 1)
        new_k0 = max(0, int(round(l0)))
        if new_k0 >= k - 1:
            new_k0 = k - 2
        if new_k0 == k0:
            break
        k0 = new_k0
    filled_y, filled_v = [], []
    if k0 > 0:
        center = meta_analysis(ys[: k - k0], vs[: k - k0], method=method)["estimate"]
        for a, v in zip(ys[k - k0:], vs[k - k0:]):
            filled_y.append(2 * center - a)
            filled_v.append(v)
    all_y = [sign * a for a in ys + filled_y]
    all_v = vs + filled_v
    adjusted = meta_analysis(all_y, all_v, method=method)
    return {
        "side": side,
        "k0": k0,
        "filled": [{"yi": sign * a, "vi": v} for a, v in zip(filled_y, filled_v)],
        "adjusted": {key: adjusted[key] for key in ("estimate", "se", "ci", "p", "tau2", "I2")},
    }


def _ranks(vals):
    order = sorted(range(len(vals)), key=lambda i: vals[i])
    ranks = [0.0] * len(vals)
    i = 0
    while i < len(order):
        j = i
        while j + 1 < len(order) and vals[order[j + 1]] == vals[order[i]]:
            j += 1
        r = (i + j) / 2 + 1
        for t in range(i, j + 1):
            ranks[order[t]] = r
        i = j + 1
    return ranks


def fail_safe_n(yi, vi, alpha=0.05):
    """Rosenthal (1979) fail-safe N. Reported for completeness; widely criticised as a bias check."""
    z = [a / math.sqrt(v) for a, v in zip(yi, vi)]
    za = norm_ppf(1 - alpha)
    return max(0, int(math.floor((sum(z) ** 2) / (za ** 2) - len(z))))


def leave_one_out(yi, vi, method="REML", labels=None):
    out = []
    labels = labels or [f"Study {i + 1}" for i in range(len(yi))]
    for i in range(len(yi)):
        y = yi[:i] + yi[i + 1:]
        v = vi[:i] + vi[i + 1:]
        m = meta_analysis(y, v, method=method)
        out.append({"omitted": labels[i], "estimate": m["estimate"], "ci": m["ci"], "I2": m["I2"], "tau2": m["tau2"]})
    return out


def cumulative(yi, vi, order=None, method="REML", labels=None):
    idx = order or list(range(len(yi)))
    labels = labels or [f"Study {i + 1}" for i in range(len(yi))]
    out = []
    for n in range(2, len(idx) + 1):
        sel = idx[:n]
        m = meta_analysis([yi[i] for i in sel], [vi[i] for i in sel], method=method)
        out.append({"added": labels[sel[-1]], "k": n, "estimate": m["estimate"], "ci": m["ci"]})
    return out


# --------------------------------------------------------------------------- simulation

def simulate_studies(k=20, mu=0.3, tau=0.15, n_min=20, n_max=200, bias=0.0, seed=1, max_tries=5000):
    """Simulate a published literature of k two-group studies (Hedges' g).

    True effects theta_i ~ N(mu, tau^2). Each study has n per group drawn uniformly.
    Publication bias: a study that is not significant and positive (p >= .05 two-sided,
    or g <= 0) is published only with probability (1 - bias). Returns published and
    unpublished ("file drawer") studies.
    """
    rnd = random.Random(seed)
    published, drawer = [], []
    tries = 0
    while len(published) < k and tries < max_tries:
        tries += 1
        n = rnd.randint(n_min, n_max)
        theta = rnd.gauss(mu, tau)
        v_true = 2 / n + theta ** 2 / (4 * n)
        g = rnd.gauss(theta, math.sqrt(v_true))
        v = 2 / n + g ** 2 / (4 * n)
        z = g / math.sqrt(v)
        p = 2 * (1 - norm_cdf(abs(z)))
        sig_pos = p < 0.05 and g > 0
        study = {"n": n, "yi": g, "vi": v, "theta": theta, "p": p, "significant": sig_pos}
        if sig_pos or rnd.random() >= bias:
            published.append(study)
        else:
            drawer.append(study)
    return {"published": published, "drawer": drawer, "attempts": tries}


def cohen_kappa(a, b):
    """Cohen's kappa for two raters' include (1) / exclude (0) decisions."""
    n = len(a)
    if n == 0 or n != len(b):
        raise ValueError("Two equal-length, non-empty lists are needed")
    po = sum(1 for x, y in zip(a, b) if x == y) / n
    pa1, pb1 = sum(a) / n, sum(b) / n
    pe = pa1 * pb1 + (1 - pa1) * (1 - pb1)
    kappa = (po - pe) / (1 - pe) if pe < 1 else 1.0
    if kappa < 0:
        label = "poor (worse than chance)"
    elif kappa <= 0.20:
        label = "slight"
    elif kappa <= 0.40:
        label = "fair"
    elif kappa <= 0.60:
        label = "moderate"
    elif kappa <= 0.80:
        label = "substantial"
    else:
        label = "almost perfect"
    return {"kappa": kappa, "observed": po, "expected": pe, "label": label + " (Landis & Koch, 1977)"}


# --------------------------------------------------------------------------- writing analysis

_CUES = {
    "descriptive": [
        r"\bfound\b", r"\breported?\b", r"\bdescribed?\b", r"\bexamined\b", r"\binvestigated\b",
        r"\bstudied\b", r"\bsurveyed\b", r"\binterviewed\b", r"\bstates?\b", r"\bdefined?\b",
        r"\baccording to\b", r"\bconducted\b", r"\bused\b", r"\bshowed\b", r"\bpublished\b",
        r"\bnoted\b", r"\bargued\b", r"\bidentified\b", r"\bsample of\b", r"\bin \d{4}\b",
        r"\(\w[^()]*\d{4}\)", r"\bet al\.", r"\bproposed\b", r"\bdeveloped\b",
    ],
    "analytical": [
        r"\bhowever\b", r"\bin contrast\b", r"\bwhereas\b", r"\bwhile\b", r"\bsimilarly\b",
        r"\blikewise\b", r"\bboth\b", r"\btogether\b", r"\bpattern\b", r"\bthemes?\b",
        r"\bsuggests?\b", r"\bindicates?\b", r"\bexplains?\b", r"\bbecause\b", r"\btherefore\b",
        r"\bthus\b", r"\bconsistent(ly)? with\b", r"\bdiffer(s|ence|ent)?\b", r"\bcompared\b",
        r"\brelationship\b", r"\bmechanism\b", r"\bdepends? on\b", r"\btaken together\b",
        r"\bacross (the )?studies\b", r"\bgroups? of studies\b", r"\bconverge\b", r"\bcontradict",
        r"\bmoderat", r"\bwhen\b.*\bthen\b", r"\bunlike\b", r"\bon the other hand\b",
    ],
    "evaluative": [
        r"\blimitation", r"\bweak(ness|er)?\b", r"\bstrong(er|ly)?\b", r"\brobust\b", r"\bflaw",
        r"\bbias", r"\bcredib", r"\bconvincing", r"\bquestionable\b", r"\bfails? to\b",
        r"\boverlook", r"\bgap\b", r"\bunderexplored\b", r"\bunclear\b", r"\binsufficient\b",
        r"\bshould\b", r"\bneeds? to\b", r"\bmust\b", r"\bit remains\b", r"\bwe argue\b",
        r"\bthis review argues\b", r"\bmore (rigorous|research)\b", r"\bfuture research\b",
        r"\bvalid", r"\breliab", r"\bgeneraliz", r"\bgeneralis", r"\blimited\b", r"\bproblematic\b",
        r"\bpromising\b", r"\bbest evidence\b", r"\bhigh[- ]quality\b", r"\blow[- ]quality\b",
        r"\boverstat", r"\bunderestimat", r"\bcaution\b",
    ],
}

TARGETS = {
    "bachelor": {"descriptive": 45, "analytical": 40, "evaluative": 15},
    "master": {"descriptive": 30, "analytical": 45, "evaluative": 25},
    "phd": {"descriptive": 20, "analytical": 45, "evaluative": 35},
    "researcher": {"descriptive": 15, "analytical": 45, "evaluative": 40},
}


def _split_sentences(text):
    text = re.sub(r"\s+", " ", text.strip())
    # protect common abbreviations
    protected = re.sub(r"\b(et al|e\.g|i\.e|cf|vs|Fig|No)\.", lambda m: m.group(0).replace(".", "§"), text)
    parts = re.split(r"(?<=[.!?])\s+(?=[A-Z(\"'])", protected)
    return [p.replace("§", ".").strip() for p in parts if len(p.strip()) > 3]


def analyze_synthesis(text, level="master"):
    """Label each sentence as descriptive, analytical or evaluative using cue phrases.

    This is a teaching heuristic, not a validated classifier: it counts signal words that
    typically mark reporting (descriptive), relating/explaining (analytical) and judging
    (evaluative) moves in academic prose (Wallace & Wray, 2021; Hart, 2018).
    """
    sentences = _split_sentences(text)
    rows = []
    totals = {"descriptive": 0, "analytical": 0, "evaluative": 0}
    for s in sentences:
        low = s.lower()
        scores, hits = {}, {}
        for kind, pats in _CUES.items():
            found = [re.search(p, low).group(0) for p in pats if re.search(p, low)]
            hits[kind] = found
            scores[kind] = len(found)
        # judgement and comparison outrank plain reporting when both appear
        weighted = {"descriptive": scores["descriptive"] * 1.0,
                    "analytical": scores["analytical"] * 1.25,
                    "evaluative": scores["evaluative"] * 1.5}
        if max(weighted.values()) == 0:
            label = "descriptive"
        else:
            label = max(weighted, key=weighted.get)
        totals[label] += 1
        rows.append({"sentence": s, "label": label, "cues": hits[label][:4]})
    n = max(1, len(rows))
    profile = {k: round(100 * v / n) for k, v in totals.items()}
    target = TARGETS.get(level, TARGETS["master"])
    advice = []
    if profile["descriptive"] > target["descriptive"] + 15:
        advice.append("Mostly reporting: group studies by what they share or dispute, and say why they differ.")
    if profile["analytical"] < target["analytical"] - 15:
        advice.append("Add comparison and explanation: 'whereas', 'taken together', 'this pattern suggests'.")
    if profile["evaluative"] < target["evaluative"] - 10:
        advice.append("Add judgement: how strong is the evidence, what are its limits, what follows for your study?")
    if profile["evaluative"] > target["evaluative"] + 25:
        advice.append("Many judgements: make sure each one is backed by the studies you described.")
    if not advice:
        advice.append("Balance is close to the target for this level.")
    return {"sentences": rows, "profile": profile, "target": target, "advice": advice, "n": len(rows)}


def effects_from_rows(kind, rows):
    """Rows as shown in the web table: [study, year, ...numbers]. Returns (yi, vi)."""
    yi, vi = [], []
    for r in rows:
        v = [float(x) for x in r[2:]]
        if kind == "rr":      # events and totals: a, n1, c, n2
            y, s = es_log_rr(v[0], v[1], v[2], v[3])
        elif kind == "smd":   # m1, sd1, n1, m2, sd2, n2
            y, s = es_hedges_g(*v)
        elif kind == "r":     # r, n
            y, s = es_fisher_z(v[0], v[1])
        elif kind == "or":    # a, b, c, d
            y, s = es_log_or(*v)
        else:                 # generic: yi, vi
            y, s = v[0], v[1]
        yi.append(y)
        vi.append(s)
    return yi, vi


# --------------------------------------------------------------------------- JSON bridge for the web page

def run_json(payload: str) -> str:
    """Single entry point used by the browser: {"fn": name, "args": {...}} -> JSON result."""
    req = json.loads(payload)
    fn = req.get("fn")
    a = req.get("args", {})
    if fn == "meta":
        if "kind" in a:  # raw study data -> effect sizes
            yi, vi = effects_from_rows(a["kind"], a["rows"])
            a["labels"] = [f"{r[0]} ({r[1]})" for r in a["rows"]]
            a["order"] = sorted(range(len(a["rows"])), key=lambda i: a["rows"][i][1])
        else:
            yi, vi = a["yi"], a["vi"]
        method = a.get("method", "REML")
        res = meta_analysis(yi, vi, method=method, hksj=a.get("hksj", False), labels=a.get("labels"))
        res["egger"] = egger_test(yi, vi)
        res["trimfill"] = trim_and_fill(yi, vi, method="FE" if method == "FE" else method) if len(yi) >= 3 else None
        res["failsafe"] = fail_safe_n(yi, vi)
        res["loo"] = leave_one_out(yi, vi, method=method, labels=a.get("labels"))
        res["years"] = [r[1] for r in a["rows"]] if "rows" in a else None
        if a.get("order"):
            res["cumulative"] = cumulative(yi, vi, order=a["order"], method=method, labels=a.get("labels"))
        out = res
    elif fn == "simulate":
        sim = simulate_studies(**a)
        pub = sim["published"]
        yi = [s["yi"] for s in pub]
        vi = [s["vi"] for s in pub]
        res = meta_analysis(yi, vi, method="REML")
        out = {
            "sim": sim,
            "meta": {key: res[key] for key in ("estimate", "ci", "tau2", "I2", "pi", "p")},
            "egger": egger_test(yi, vi),
            "trimfill": trim_and_fill(yi, vi, method="REML"),
        }
        if sim["drawer"]:
            ally = yi + [s["yi"] for s in sim["drawer"]]
            allv = vi + [s["vi"] for s in sim["drawer"]]
            full = meta_analysis(ally, allv, method="REML")
            out["all"] = {key: full[key] for key in ("estimate", "ci", "tau2", "I2")}
    elif fn == "kappa":
        out = cohen_kappa(a["a"], a["b"])
    elif fn == "synthesis":
        out = analyze_synthesis(a["text"], a.get("level", "master"))
    elif fn == "es":
        kind = a["kind"]
        if kind == "rr":
            yi, vi = es_log_rr(a["a"], a["n1"], a["c"], a["n2"])
        elif kind == "or":
            yi, vi = es_log_or(a["a"], a["b"], a["c"], a["d"])
        elif kind == "smd":
            yi, vi = es_hedges_g(a["m1"], a["sd1"], a["n1"], a["m2"], a["sd2"], a["n2"])
        elif kind == "r":
            yi, vi = es_fisher_z(a["r"], a["n"])
        else:
            raise ValueError("unknown effect size kind")
        out = {"yi": yi, "vi": vi}
    else:
        raise ValueError(f"unknown function {fn!r}")
    return json.dumps(out)


# --------------------------------------------------------------------------- example data

# BCG vaccine trials (Colditz et al., 1994), the classic teaching dataset used in metafor.
BCG = [
    # trial, author, year, tpos, tneg, cpos, cneg, absolute latitude
    (1, "Aronson", 1948, 4, 119, 11, 128, 44),
    (2, "Ferguson & Simes", 1949, 6, 300, 29, 274, 55),
    (3, "Rosenthal et al.", 1960, 3, 228, 11, 209, 42),
    (4, "Hart & Sutherland", 1977, 62, 13536, 248, 12619, 52),
    (5, "Frimodt-Moller et al.", 1973, 33, 5036, 47, 5761, 13),
    (6, "Stein & Aronson", 1953, 180, 1361, 372, 1079, 44),
    (7, "Vandiviere et al.", 1973, 8, 2537, 10, 619, 19),
    (8, "TPT Madras", 1980, 505, 87886, 499, 87892, 13),
    (9, "Coetzee & Berjak", 1968, 29, 7470, 45, 7232, 27),
    (10, "Rosenthal et al.", 1961, 17, 1699, 65, 1600, 42),
    (11, "Comstock et al.", 1974, 186, 50448, 141, 27197, 18),
    (12, "Comstock & Webster", 1969, 5, 2493, 3, 2338, 33),
    (13, "Comstock et al.", 1976, 27, 16886, 29, 17825, 33),
]


def bcg_effects():
    yi, vi, labels = [], [], []
    for _, author, year, tp, tn, cp, cn, _lat in BCG:
        y, v = es_log_rr(tp, tp + tn, cp, cp + cn)
        yi.append(y)
        vi.append(v)
        labels.append(f"{author} ({year})")
    return yi, vi, labels


if __name__ == "__main__":
    y, v, lab = bcg_effects()
    for m in ("FE", "DL", "REML"):
        r = meta_analysis(y, v, method=m)
        print(f"{m:5s} est={r['estimate']:.4f} se={r['se']:.4f} tau2={r['tau2']:.4f} I2={r['I2']:.2f} Q={r['Q']:.4f} p={r['p']:.2e}")
    print("Egger:", egger_test(y, v))
    print("Trim-and-fill:", trim_and_fill(y, v, method="REML"))
