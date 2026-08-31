"""
encryption_service.py — Resume text encryption at rest using Fernet symmetric encryption.

Encryption key must be stored as RESUME_ENCRYPTION_KEY env var (32-url-safe-base64 bytes).
Generate with: python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
"""

import os
import logging

log = logging.getLogger("encryption")

try:
    from cryptography.fernet import Fernet
    _key = os.getenv("RESUME_ENCRYPTION_KEY", "").encode()
    if _key:
        _cipher = Fernet(_key)
        _enabled = True
        log.info("Resume encryption ENABLED.")
    else:
        _cipher = None
        _enabled = False
        log.warning("RESUME_ENCRYPTION_KEY not set — resume text will be stored in cleartext.")
except Exception as e:
    _cipher = None
    _enabled = False
    log.error("Encryption init failed: %s", e)


def encrypt_text(text: str) -> str:
    """
    Encrypt resume text for storage.
    Returns encrypted base64 string, or original text if encryption is disabled.
    """
    if not _enabled or _cipher is None:
        return text
    try:
        return _cipher.encrypt(text.encode()).decode()
    except Exception as e:
        log.error("Encryption failed: %s", e)
        return text  # Fallback to plaintext rather than losing data


def decrypt_text(encrypted: str) -> str:
    """
    Decrypt resume text for analysis.
    Returns plaintext, or original string if encryption is disabled.
    """
    if not _enabled or _cipher is None:
        return encrypted
    try:
        return _cipher.decrypt(encrypted.encode()).decode()
    except Exception as e:
        log.error("Decryption failed: %s", e)
        return encrypted


def is_encryption_enabled() -> bool:
    return _enabled
