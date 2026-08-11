import hashlib
import io
import math
import re
import zipfile
import xml.etree.ElementTree as ET
from typing import List, Tuple, Dict, Set
from pypdf import PdfReader
from ..models import Contract

try:
    from blake3 import blake3
    HAS_BLAKE3 = True
except ImportError:
    HAS_BLAKE3 = False

def calculate_file_hash(file_bytes: bytes) -> str:
    """Calculate the BLAKE3 hash of a file's bytes for fast cryptographic duplicate detection."""
    if HAS_BLAKE3:
        return blake3(file_bytes).hexdigest()
    # Fallback to sha256 if blake3 library is missing
    return hashlib.sha256(file_bytes).hexdigest()


def extract_text_from_pdf(file_bytes: bytes) -> str:
    """Extract text from PDF file bytes using pypdf."""
    try:
        reader = PdfReader(io.BytesIO(file_bytes))
        text = ""
        for page in reader.pages:
            extracted = page.extract_text()
            if extracted:
                text += extracted + "\n"
        return text.strip()
    except Exception as e:
        print(f"Error extracting PDF text: {e}")
        return ""

def extract_text_from_docx(file_bytes: bytes) -> str:
    """Extract text from DOCX file bytes using standard zipfile and xml parsing."""
    try:
        docx = zipfile.ZipFile(io.BytesIO(file_bytes))
        xml_content = docx.read('word/document.xml')
        root = ET.fromstring(xml_content)
        
        paragraphs = []
        for paragraph in root.iter('{http://schemas.openxmlformats.org/wordprocessingml/2006/main}p'):
            texts = [node.text for node in paragraph.iter('{http://schemas.openxmlformats.org/wordprocessingml/2006/main}t') if node.text]
            if texts:
                paragraphs.append(''.join(texts))
        return '\n'.join(paragraphs).strip()
    except Exception as e:
        print(f"Error extracting DOCX text: {e}")
        return ""

def tokenize(text: str) -> List[str]:
    """Tokenize text into lowercase alphanumeric words."""
    if not text:
        return []
    return re.findall(r'\b[a-z0-9]+\b', text.lower())

def get_tf(tokens: List[str]) -> Dict[str, float]:
    """Calculate normalized Term Frequency (TF) for a token list."""
    tf = {}
    if not tokens:
        return tf
    for t in tokens:
        tf[t] = tf.get(t, 0) + 1
    # Normalize by document size
    total = len(tokens)
    for t in tf:
        tf[t] = tf[t] / total
    return tf

def get_idf(docs_tokens: List[List[str]], vocab: Set[str]) -> Dict[str, float]:
    """Calculate Inverse Document Frequency (IDF) with smoothing."""
    idf = {}
    N = len(docs_tokens)
    if N == 0:
        return idf
    for word in vocab:
        df = sum(1 for doc in docs_tokens if word in doc)
        # Smooth IDF calculation
        idf[word] = math.log((1 + N) / (1 + df)) + 1
    return idf

def build_vector(tf: Dict[str, float], idf: Dict[str, float]) -> Dict[str, float]:
    """Build a TF-IDF vector."""
    vec = {}
    for word, tf_val in tf.items():
        if word in idf:
            vec[word] = tf_val * idf[word]
    return vec

def cosine_similarity(vec1: Dict[str, float], vec2: Dict[str, float]) -> float:
    """Calculate cosine similarity between two sparse vector representations."""
    if not vec1 or not vec2:
        return 0.0
    
    # Calculate dot product
    common_words = set(vec1.keys()).intersection(set(vec2.keys()))
    dot_product = sum(vec1[w] * vec2[w] for w in common_words)
    
    # Calculate magnitudes
    mag1 = math.sqrt(sum(v**2 for v in vec1.values()))
    mag2 = math.sqrt(sum(v**2 for v in vec2.values()))
    
    if mag1 == 0.0 or mag2 == 0.0:
        return 0.0
        
    return dot_product / (mag1 * mag2)

def search_semantic(query: str, contracts: List[Contract]) -> List[Tuple[Contract, float]]:
    """
    Search contracts semantically using custom TF-IDF and Cosine Similarity.
    Returns list of tuples (Contract, score) sorted by score descending.
    """
    if not query or not contracts:
        return []

    query_tokens = tokenize(query)
    if not query_tokens:
        return [(c, 0.0) for c in contracts]

    # Pre-tokenize all contract content
    docs_tokens = []
    valid_contracts = []
    
    for c in contracts:
        # Combine filename, metadata, and body text for richer indexing
        combined_text = f"{c.filename or ''} {c.employer_name} {c.client_name} {c.company_name} {c.text_content or ''}"
        tokens = tokenize(combined_text)
        docs_tokens.append(tokens)
        valid_contracts.append(c)

    # Build overall vocabulary
    vocab = set()
    for tokens in docs_tokens:
        vocab.update(tokens)
    vocab.update(query_tokens)

    # Compute IDF
    idf = get_idf(docs_tokens, vocab)

    # Compute vectors
    query_tf = get_tf(query_tokens)
    query_vec = build_vector(query_tf, idf)

    results = []
    for idx, c in enumerate(valid_contracts):
        doc_tf = get_tf(docs_tokens[idx])
        doc_vec = build_vector(doc_tf, idf)
        
        # Calculate similarity score
        score = cosine_similarity(query_vec, doc_vec)
        
        # Boost score slightly if there are exact word overlaps from query
        overlap = set(query_tokens).intersection(set(docs_tokens[idx]))
        if overlap:
            # Add small bonus for exact matches
            score += 0.05 * (len(overlap) / len(query_tokens))
            
        results.append((c, min(score, 1.0)))

    # Sort results by score descending
    results.sort(key=lambda x: x[1], reverse=True)
    return results

def classify_query(query: str) -> str:
    """
    Classify user query into METADATA, RAG, or KEYWORD search.
    """
    q = query.lower().strip()
    
    # 1. RAG / Content question triggers (takes precedence)
    rag_keywords = [
        'summarize', 'summary', 'explain', 'clause', 'clauses', 'terms', 'payment', 'payments', 
        'termination', 'obligation', 'obligations', 'responsibility', 'responsible',
        'penalty', 'penalties', 'liability', 'liabilities', 'indemnification',
        'indemnity', 'governing', 'confidential', 'force majeure',
        'what', 'who', 'when', 'where', 'how', 'why', 'can', 'is', 'are', 'does', 'do'
    ]
    # Match whole words for question words to avoid sub-word overlap
    word_pattern = r'\b(' + '|'.join(rag_keywords) + r')\b'
    if re.search(word_pattern, q):
        return "RAG"
        
    # 2. Metadata Search triggers
    meta_keywords = [
        'expired', 'active', 'expiring', 'renewal', 'due', 'date', 'month', 'year', 'day', 'days', 'soon'
    ]
    meta_pattern = r'\b(' + '|'.join(meta_keywords) + r')\b'
    if re.search(meta_pattern, q):
        return "METADATA"
        
    # Pattern indicating relations or specific types
    if re.search(r'\b(of|with|by|for)\s+\w+', q) or 'contracts' in q or 'nda' in q or 'sla' in q:
        return "METADATA"
        
    # 3. Default to Keyword Search
    return "KEYWORD"

def search_bm25(query: str, contracts: List[Contract], k1: float = 1.5, b: float = 0.75) -> List[Tuple[Contract, float]]:
    """
    Rank contracts using the BM25 algorithm.
    Returns list of tuples (Contract, score) sorted by score descending.
    """
    if not query or not contracts:
        return []
        
    query_tokens = tokenize(query)
    if not query_tokens:
        return [(c, 0.0) for c in contracts]
        
    # Pre-tokenize docs
    docs_tokens = []
    valid_contracts = []
    for c in contracts:
        combined_text = f"{c.filename or ''} {c.employer_name} {c.client_name} {c.company_name} {c.text_content or ''}"
        tokens = tokenize(combined_text)
        docs_tokens.append(tokens)
        valid_contracts.append(c)
        
    N = len(docs_tokens)
    if N == 0:
        return []
        
    doc_lens = [len(tokens) for tokens in docs_tokens]
    avgdl = sum(doc_lens) / N if N > 0 else 0.0
    
    # Document Frequency (DF)
    df = {}
    for word in set(query_tokens):
        df[word] = sum(1 for doc in docs_tokens if word in doc)
        
    # Inverse Document Frequency (IDF)
    idf = {}
    for word in set(query_tokens):
        n_q = df.get(word, 0)
        idf[word] = math.log((N - n_q + 0.5) / (n_q + 0.5) + 1.0)
        
    results = []
    for idx, c in enumerate(valid_contracts):
        doc = docs_tokens[idx]
        doc_len = doc_lens[idx]
        
        score = 0.0
        doc_tf = {}
        for word in doc:
            doc_tf[word] = doc_tf.get(word, 0) + 1
            
        for word in query_tokens:
            if word in doc_tf:
                tf = doc_tf[word]
                numerator = tf * (k1 + 1.0)
                denominator = tf + k1 * (1.0 - b + b * (doc_len / avgdl if avgdl > 0 else 1.0))
                score += idf.get(word, 0.0) * (numerator / denominator)
                
        results.append((c, score))
        
    # Normalize score to [0.0, 1.0] range
    if results:
        max_score = max(r[1] for r in results)
        if max_score > 0.0:
            results = [(c, score / max_score) for c, score in results]
        else:
            results = [(c, 0.0) for c, score in results]
            
    results.sort(key=lambda x: x[1], reverse=True)
    return results
