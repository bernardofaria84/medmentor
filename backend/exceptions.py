"""
Custom exceptions for MedMentor application
"""

class EmbeddingGenerationError(Exception):
    """Raised when embedding generation fails"""
    pass

class ValidationError(Exception):
    """Raised when response validation fails"""
    pass

class ContentProcessingError(Exception):
    """Raised when content processing fails"""
    pass
