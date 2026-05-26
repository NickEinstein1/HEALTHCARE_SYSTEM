"""Patient portal password hashing (stdlib — no extra deps)."""

import hashlib
import secrets

MAX_PASSWORD_CHANGES = 2
MIN_PASSWORD_LENGTH = 8


def hash_password(plain: str) -> str:
    salt = secrets.token_hex(16)
    digest = hashlib.pbkdf2_hmac("sha256", plain.encode("utf-8"), salt.encode("utf-8"), 120_000)
    return f"pbkdf2_sha256${salt}${digest.hex()}"


def verify_password(plain: str, stored: str) -> bool:
    if not stored or not plain:
        return False
    try:
        algo, salt, hexdigest = stored.split("$", 2)
        if algo != "pbkdf2_sha256":
            return False
        digest = hashlib.pbkdf2_hmac("sha256", plain.encode("utf-8"), salt.encode("utf-8"), 120_000)
        return secrets.compare_digest(digest.hex(), hexdigest)
    except ValueError:
        return False
