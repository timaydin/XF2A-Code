"""XenForo add-on file hashing helpers."""
import hashlib


def xenforo_sha256(data: bytes) -> str:
    """Return XenForo's SHA-256 digest, which ignores carriage returns."""
    return hashlib.sha256(data.replace(b'\r', b'')).hexdigest()
