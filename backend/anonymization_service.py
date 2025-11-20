"""
LGPD/HIPAA Compliant Data Anonymization Service
Removes Personally Identifiable Information (PII) from user messages
"""

import spacy
import re
from typing import Dict, List
from datetime import datetime

# Load Portuguese NER model
nlp = spacy.load("pt_core_news_lg")

class AnonymizationService:
    """Service for anonymizing PII in medical conversations"""
    
    def __init__(self):
        self.entity_counters = {}  # Track entity replacements per session
        
    def anonymize_text(self, text: str, conversation_id: str = None) -> Dict[str, str]:
        """
        Anonymize PII from text while preserving medical context
        
        Returns:
            Dict with 'anonymized_text' (for storage) and 'original_text' (for AI processing)
        """
        
        if not text or not text.strip():
            return {"anonymized_text": text, "original_text": text}
        
        # Initialize counter for this conversation if needed
        if conversation_id and conversation_id not in self.entity_counters:
            self.entity_counters[conversation_id] = {
                "PER": 0,  # Person names
                "LOC": 0,  # Locations
                "ORG": 0,  # Organizations
                "DATE": 0  # Dates
            }
        
        # Process text with spaCy NER
        doc = nlp(text)
        
        anonymized_text = text
        replacements = []
        
        # Extract and replace named entities
        for ent in reversed(doc.ents):  # Reverse to maintain correct indices
            entity_type = ent.label_
            entity_text = ent.text
            start = ent.start_char
            end = ent.end_char
            
            placeholder = None
            
            # Map entity types to LGPD/HIPAA categories
            if entity_type == "PER":  # Person names
                if conversation_id:
                    self.entity_counters[conversation_id]["PER"] += 1
                    placeholder = f"[PACIENTE_{self.entity_counters[conversation_id]['PER']}]"
                else:
                    placeholder = "[PACIENTE]"
                    
            elif entity_type in ["LOC"]:  # Locations
                if conversation_id:
                    self.entity_counters[conversation_id]["LOC"] += 1
                    placeholder = f"[LOCAL_{self.entity_counters[conversation_id]['LOC']}]"
                else:
                    placeholder = "[LOCAL]"
                    
            elif entity_type == "ORG":  # Organizations (hospitals, clinics)
                if conversation_id:
                    self.entity_counters[conversation_id]["ORG"] += 1
                    placeholder = f"[INSTITUIÇÃO_{self.entity_counters[conversation_id]['ORG']}]"
                else:
                    placeholder = "[INSTITUIÇÃO]"
            
            # Replace entity in text
            if placeholder:
                anonymized_text = (
                    anonymized_text[:start] + 
                    placeholder + 
                    anonymized_text[end:]
                )
                replacements.append({
                    "original": entity_text,
                    "placeholder": placeholder,
                    "type": entity_type,
                    "start": start,
                    "end": end
                })
        
        # Additional regex-based anonymization for dates
        anonymized_text = self._anonymize_dates(anonymized_text, conversation_id)
        
        # Anonymize Brazilian documents (CPF, RG)
        anonymized_text = self._anonymize_br_documents(anonymized_text)
        
        # Anonymize phone numbers
        anonymized_text = self._anonymize_phone_numbers(anonymized_text)
        
        # Anonymize emails
        anonymized_text = self._anonymize_emails(anonymized_text)
        
        return {
            "anonymized_text": anonymized_text,
            "original_text": text,  # Keep original for AI context
            "replacements": replacements
        }
    
    def _anonymize_dates(self, text: str, conversation_id: str = None) -> str:
        """Anonymize date patterns"""
        # Brazilian date formats: dd/mm/yyyy, dd-mm-yyyy
        date_patterns = [
            r'\b\d{1,2}[/-]\d{1,2}[/-]\d{2,4}\b',  # dd/mm/yyyy or dd-mm-yyyy
            r'\b\d{4}[/-]\d{1,2}[/-]\d{1,2}\b',    # yyyy-mm-dd
        ]
        
        for pattern in date_patterns:
            text = re.sub(pattern, '[DATA]', text)
        
        return text
    
    def _anonymize_br_documents(self, text: str) -> str:
        """Anonymize Brazilian documents (CPF, RG, CNS)"""
        # CPF: xxx.xxx.xxx-xx or xxxxxxxxxxx
        text = re.sub(r'\b\d{3}\.\d{3}\.\d{3}-\d{2}\b', '[CPF]', text)
        text = re.sub(r'\b\d{11}\b', '[CPF]', text)
        
        # RG: xx.xxx.xxx-x
        text = re.sub(r'\b\d{2}\.\d{3}\.\d{3}-\d{1}\b', '[RG]', text)
        
        # CNS (Cartão Nacional de Saúde): 15 digits
        text = re.sub(r'\b\d{15}\b', '[CNS]', text)
        
        return text
    
    def _anonymize_phone_numbers(self, text: str) -> str:
        """Anonymize phone numbers"""
        # Brazilian phone patterns
        phone_patterns = [
            r'\(\d{2}\)\s?\d{4,5}-?\d{4}',  # (11) 98765-4321 or (11) 3456-7890
            r'\b\d{2}\s?\d{4,5}-?\d{4}\b',  # 11 98765-4321
            r'\+55\s?\d{2}\s?\d{4,5}-?\d{4}',  # +55 11 98765-4321
        ]
        
        for pattern in phone_patterns:
            text = re.sub(pattern, '[TELEFONE]', text)
        
        return text
    
    def _anonymize_emails(self, text: str) -> str:
        """Anonymize email addresses"""
        email_pattern = r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b'
        text = re.sub(email_pattern, '[EMAIL]', text)
        return text
    
    def get_anonymization_stats(self, conversation_id: str) -> Dict:
        """Get anonymization statistics for a conversation"""
        if conversation_id in self.entity_counters:
            return self.entity_counters[conversation_id]
        return {}


# Singleton instance
anonymization_service = AnonymizationService()
