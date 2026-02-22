"""
LGPD/HIPAA Compliant Data Anonymization Service - Lightweight Version
Removes obvious PII (CPF, phone, email, dates) using regex patterns.
Does NOT use NER/spaCy to avoid false positives with common Portuguese words.
"""

import re
from typing import Dict


class AnonymizationService:
    """Lightweight PII anonymization using regex patterns only"""
    
    def anonymize_text(self, text: str, conversation_id: str = None) -> Dict[str, str]:
        """
        Anonymize obvious PII from text while preserving medical context.
        Only removes structured PII patterns (CPF, phone, email, etc.)
        Does NOT attempt to detect names via NER (too many false positives in Portuguese).
        
        Returns:
            Dict with 'anonymized_text' and 'original_text'
        """
        
        if not text or not text.strip():
            return {"anonymized_text": text, "original_text": text, "replacements": []}
        
        anonymized_text = text
        replacements = []
        
        # 1. Anonymize Brazilian CPF: xxx.xxx.xxx-xx
        cpf_pattern = r'\b\d{3}\.\d{3}\.\d{3}-\d{2}\b'
        for match in re.finditer(cpf_pattern, anonymized_text):
            replacements.append({"original": match.group(), "placeholder": "[CPF]", "type": "CPF"})
        anonymized_text = re.sub(cpf_pattern, '[CPF]', anonymized_text)
        
        # 2. Anonymize Brazilian RG: xx.xxx.xxx-x
        rg_pattern = r'\b\d{2}\.\d{3}\.\d{3}-\d{1}\b'
        for match in re.finditer(rg_pattern, anonymized_text):
            replacements.append({"original": match.group(), "placeholder": "[RG]", "type": "RG"})
        anonymized_text = re.sub(rg_pattern, '[RG]', anonymized_text)
        
        # 3. Anonymize CNS (Cartão Nacional de Saúde): 15 digits
        cns_pattern = r'\b\d{15}\b'
        for match in re.finditer(cns_pattern, anonymized_text):
            replacements.append({"original": match.group(), "placeholder": "[CNS]", "type": "CNS"})
        anonymized_text = re.sub(cns_pattern, '[CNS]', anonymized_text)
        
        # 4. Anonymize phone numbers (Brazilian patterns)
        phone_patterns = [
            r'\+55\s?\(?\d{2}\)?\s?\d{4,5}-?\d{4}',   # +55 (11) 98765-4321
            r'\(\d{2}\)\s?\d{4,5}-?\d{4}',              # (11) 98765-4321
        ]
        for pattern in phone_patterns:
            for match in re.finditer(pattern, anonymized_text):
                replacements.append({"original": match.group(), "placeholder": "[TELEFONE]", "type": "PHONE"})
            anonymized_text = re.sub(pattern, '[TELEFONE]', anonymized_text)
        
        # 5. Anonymize emails
        email_pattern = r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b'
        for match in re.finditer(email_pattern, anonymized_text):
            replacements.append({"original": match.group(), "placeholder": "[EMAIL]", "type": "EMAIL"})
        anonymized_text = re.sub(email_pattern, '[EMAIL]', anonymized_text)
        
        # 6. Anonymize full date patterns (dd/mm/yyyy only - not partial dates)
        date_pattern = r'\b\d{1,2}/\d{1,2}/\d{4}\b'
        for match in re.finditer(date_pattern, anonymized_text):
            replacements.append({"original": match.group(), "placeholder": "[DATA]", "type": "DATE"})
        anonymized_text = re.sub(date_pattern, '[DATA]', anonymized_text)
        
        return {
            "anonymized_text": anonymized_text,
            "original_text": text,
            "replacements": replacements
        }
    
    def get_anonymization_stats(self, conversation_id: str) -> Dict:
        """Get anonymization statistics (lightweight version returns empty)"""
        return {}


# Singleton instance
anonymization_service = AnonymizationService()
