from __future__ import annotations

import re

CRITICAL_RULES = {
    "ransomware": "Ransomware or encryption language detected",
    "security breach": "Possible security breach reported",
    "data breach": "Possible data breach reported",
    "data loss": "Potential data loss reported",
    "system down": "System-wide outage language detected",
    "all users": "Issue appears to affect all users",
    "everyone": "Issue appears to affect many users",
    "malware": "Possible malware incident reported",
    "stolen laptop": "Potential loss of a company device",
    "lost company laptop": "Potential loss of a company device",
}

HIGH_RULES = {
    "cannot work": "User states they cannot work",
    "can't work": "User states they cannot work",
    "account locked": "Locked account blocks access",
    "internet unavailable": "Internet access is unavailable",
    "no internet": "Internet access is unavailable",
    "application unavailable": "Required application is unavailable",
    "cannot sign in": "User cannot sign in",
    "can't sign in": "User cannot sign in",
    "vpn will not connect": "Remote access is unavailable",
    "vpn won't connect": "Remote access is unavailable",
    "production": "Production-impact language detected",
    "urgent": "User marked the issue as urgent",
}

LOW_RULES = {
    "how do i": "How-to request with no outage language",
    "request for": "Service request rather than an outage",
    "need instructions": "Guidance request rather than a failure",
    "set default": "Configuration request",
}


def detect_priority(title: str, description: str, category: str | None = None) -> dict:
    text = re.sub(r"\s+", " ", f"{title} {description}").lower().strip()

    critical_hits = [reason for term, reason in CRITICAL_RULES.items() if term in text]
    if category == "Security" and any(
        term in text for term in ["clicked", "malware", "unknown login", "unexpected sign-in", "compromised", "exposed"]
    ):
        critical_hits.append("Security incident requires immediate review")

    if critical_hits:
        return {"priority": "Critical", "reasons": sorted(set(critical_hits))}

    high_hits = [reason for term, reason in HIGH_RULES.items() if term in text]
    if category == "Security":
        high_hits.append("Security-related ticket requires prompt review")
    if high_hits:
        return {"priority": "High", "reasons": sorted(set(high_hits))}

    low_hits = [reason for term, reason in LOW_RULES.items() if term in text]
    if low_hits:
        return {"priority": "Low", "reasons": sorted(set(low_hits))}

    return {"priority": "Medium", "reasons": ["No critical, high-impact, or low-impact rule matched"]}
