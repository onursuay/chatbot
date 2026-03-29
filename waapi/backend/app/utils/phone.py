"""Telefon numarasi formatlama — apps_script.js formatPhoneNumber() port'u."""

import re


def format_phone_number(phone: str | None) -> str | None:
    """Telefon numarasini E.164 formatina donusturur (+90XXXXXXXXXX)."""
    if not phone:
        return None

    phone = re.sub(r"[\s\-\(\)\+]", "", str(phone))

    if phone.startswith("90") and len(phone) == 12:
        return f"+{phone}"
    if phone.startswith("0") and len(phone) == 11:
        return f"+9{phone}"
    if phone.startswith("5") and len(phone) == 10:
        return f"+90{phone}"

    # Uluslararasi numara (90 ile baslamayan ama + ile geldi)
    if len(phone) >= 10 and phone.isdigit():
        return f"+{phone}"

    return None


def normalize_wa_id(wa_id: str) -> str:
    """WhatsApp ID'yi temizler (+ olmadan, sadece rakamlar)."""
    return re.sub(r"[^\d]", "", str(wa_id))
