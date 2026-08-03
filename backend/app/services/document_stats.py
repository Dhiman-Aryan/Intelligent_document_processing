"""
Pure aggregation helpers over a list of document dicts — no data
lives here. Used by the /documents/stats/* endpoints against whatever
real documents list_documents() returns (which is an empty list, and
therefore all-zero stats, until Databricks is configured — see
routers/documents.py).
"""


def compute_stats(documents: list[dict]) -> dict:
    total = len(documents)
    completed = sum(1 for d in documents if d["processing_status"] == "COMPLETED")
    processing = sum(1 for d in documents if d["processing_status"] == "PROCESSING")
    failed = sum(1 for d in documents if d["processing_status"] == "FAILED")
    passed = sum(1 for d in documents if d["validation_status"] == "PASS")
    validation_failed = sum(1 for d in documents if d["validation_status"] == "FAILED")

    scored = [d["extraction_confidence_score"] for d in documents if d["extraction_confidence_score"] is not None]
    avg_confidence = round(sum(scored) / len(scored)) if scored else 0

    return {
        "total": total,
        "completed": completed,
        "processing": processing,
        "failed": failed,
        "passed": passed,
        "validation_failed": validation_failed,
        "avg_confidence": avg_confidence,
    }


def compute_counts_by_type(documents: list[dict]) -> list[dict]:
    types = ["RESUME", "EMAIL", "INVOICE", "BANK_STATEMENT", "PRESCRIPTION"]
    return [{"type": t, "count": sum(1 for d in documents if d["document_type"] == t)} for t in types]
