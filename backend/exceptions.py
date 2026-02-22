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

class ResponseValidationError(Exception):
    """
    Raised when a RAG response fails post-generation validation.
    This includes:
    - Missing citations in the response
    - Invalid/fabricated source references
    """
    def __init__(self, message: str, response_text: str = "", citations: list = None):
        super().__init__(message)
        self.response_text = response_text
        self.citations = citations or []
