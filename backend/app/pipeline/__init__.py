"""
Lab report ingestion pipeline package.

Three stages, independently importable and testable:
  Stage 1 - ollama_extractor: image/PDF -> structured JSON via local Ollama (Qwen2.5-VL)
  Stage 2a - normalizer: raw test name -> canonical name via rapidfuzz
  Stage 2b - ner_tagger: narrative text -> biomedical entities via HuggingFace NER
  Orchestrator - chains all stages and writes results to the database
"""
